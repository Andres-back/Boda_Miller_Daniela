(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  let state, saving = false, loading = false;
  const dialog = $('#seat-dialog'), form = $('#seat-form');
  const request = (...args) => window.AdminAccess.fetch(...args);
  window.AdminSections = {
    show(view) {
      if (!['modules', 'guests', 'tables', 'account'].includes(view)) return;
      $('.admin-layout').dataset.view = view;
      for (const [name, panel] of [['modules', 'module'], ['guests', 'guests'], ['tables', 'tables'], ['account', 'account']]) {
        $('#' + panel + '-editor').hidden = name !== view;
        $('#' + name + '-tab').classList.toggle('active', name === view);
        if (name === view) $('#' + name + '-tab').setAttribute('aria-current', 'page');
        else $('#' + name + '-tab').removeAttribute('aria-current');
      }
      $('#module-list').classList.toggle('hidden', view !== 'modules');
      $('#module-workspace-toolbar').hidden = view !== 'modules';
      $('#save-button').hidden = view !== 'modules';
      $('.header-center').hidden = view !== 'modules';
      const names = { modules: ['Invitación', 'invitacion'], guests: ['Confirmaciones', 'confirmaciones'], tables: ['Mesas', 'mesas'], account: ['Cuenta y respaldos', 'cuenta'] };
      $('#admin-current-view').textContent = names[view][0];
      document.title = names[view][0] + ' · Administración de Miller & Daniela';
      history.replaceState(null, '', '#' + names[view][1]);
    },
    workspace(mode) {
      if (!['edit', 'preview'].includes(mode)) return;
      $('.admin-layout').dataset.workspace = mode;
      for (const button of document.querySelectorAll('[data-workspace-mode]')) button.setAttribute('aria-pressed', String(button.dataset.workspaceMode === mode));
    }
  };
  for (const button of document.querySelectorAll('[data-workspace-mode]')) button.addEventListener('click', () => window.AdminSections.workspace(button.dataset.workspaceMode));
  $('#account-tab').addEventListener('click', () => window.AdminSections.show('account'));
  const tableLabel = table => `Mesa ${table.number}${table.name ? ' · ' + table.name : ''}`;
  const assignmentFor = id => state.assignments.find(assignment => assignment.guestId === id);
  function status(message, error = false) { $('#seating-status').textContent = message; $('#seating-status').classList.toggle('is-error', error); }
  function setBusy(value) {
    saving = value;
    $('#tables-editor').setAttribute('aria-busy', String(value));
    for (const button of document.querySelectorAll('#tables-editor button, #seat-form button')) {
      if (value) { button.dataset.preDisabled = String(button.disabled); button.disabled = true; }
      else if (button.dataset.preDisabled !== undefined) { button.disabled = button.dataset.preDisabled === 'true'; delete button.dataset.preDisabled; }
    }
  }
  async function load() {
    if (saving || loading) return;
    loading = true; status('Cargando distribución…');
    try {
      const response = await request('/api/seating');
      if (!response.ok) throw new Error('No se pudo cargar la distribución.');
      state = await response.json(); render(); status('Cada cambio de mesas se guarda automáticamente.');
    } catch (error) { status(error.message, true); } finally { loading = false; }
  }
  async function commit(next) {
    if (saving || !state) return false;
    setBusy(true); status('Guardando distribución…');
    try {
      const response = await request('/api/seating', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revision: state.revision, tables: next.tables, assignments: next.assignments, names: next.names }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'No se pudo guardar.');
      state = { ...state, ...result };
      for (const guest of state.guests) guest.name = state.names[guest.id] || guest.defaultName || (guest.position === 1 ? guest.group : `Acompañante ${guest.position - 1} de ${guest.group}`);
      status('Distribución guardada.');
      return true;
    } catch (error) { status(error.message, true); $('#seat-error').textContent = error.message; return false; }
    finally { setBusy(false); render(); }
  }
  function render() {
    if (!state) return;
    const capacity = state.tables.reduce((sum, table) => sum + table.capacity, 0), occupied = state.assignments.length;
    const unassigned = state.guests.filter(guest => !assignmentFor(guest.id));
    $('#seating-summary').innerHTML = [[state.tables.length, 'Mesas'], [occupied, 'Personas ubicadas'], [capacity - occupied, 'Sillas libres'], [unassigned.length, 'Sin mesa']].map(([number, text]) => `<div><strong>${number}</strong><span>${text}</span></div>`).join('');
    const query = $('#seating-search').value.trim().toLocaleLowerCase('es');
    const people = new Map(state.guests.map(guest => [guest.id, guest]));
    $('#table-cards').innerHTML = state.tables.map(table => {
      const assigned = state.assignments.filter(assignment => assignment.tableId === table.id);
      if (query && ![tableLabel(table), ...assigned.map(assignment => people.get(assignment.guestId)?.name || '')].some(text => text.toLocaleLowerCase('es').includes(query))) return '';
      return `<article class="seating-card"><header><div><h3>${esc(tableLabel(table))}</h3><p>${assigned.length} de ${table.capacity} sillas ocupadas</p></div><button class="table-delete secondary" data-id="${esc(table.id)}" type="button" ${assigned.length ? 'disabled title="Retira a las personas antes de eliminar la mesa"' : ''}>Eliminar</button></header><div class="seat-grid">${Array.from({ length: table.capacity }, (_, i) => {
        const assignment = assigned.find(item => item.seat === i + 1), guest = people.get(assignment?.guestId);
        return `<button class="seat ${guest ? 'occupied' : ''}" type="button" data-table="${esc(table.id)}" data-seat="${i + 1}"><span>Silla ${i + 1}</span><strong>${guest ? esc(guest.name) : '+ Asignar'}</strong>${guest ? `<small>${esc(guest.group)}</small>` : '<small>Disponible</small>'}</button>`;
      }).join('')}</div><details class="table-settings"><summary>Editar nombre y capacidad</summary><form class="table-edit" data-id="${esc(table.id)}"><label>Nombre<input name="name" maxlength="80" value="${esc(table.name)}"></label><label>Sillas<input name="capacity" type="number" min="1" max="20" required value="${table.capacity}"></label><button type="submit" class="secondary">Guardar mesa</button></form></details></article>`;
    }).join('') || `<div class="seating-empty">${state.tables.length ? 'No hay mesas que coincidan con tu búsqueda.' : 'Crea la primera mesa para empezar a ubicar a tus invitados.'}</div>`;
    $('#unassigned-count').textContent = String(unassigned.length);
    $('#unassigned-list').innerHTML = unassigned.filter(guest => (guest.name + ' ' + guest.group).toLocaleLowerCase('es').includes(query)).map(guest => `<button type="button" class="unassigned-guest" data-guest="${esc(guest.id)}"><strong>${esc(guest.name)}</strong><span>Grupo de ${esc(guest.group)}</span><small>Elegir lugar</small></button>`).join('') || '<p class="seating-empty">No hay personas pendientes con este filtro. Las nuevas confirmaciones aparecerán aquí.</p>';
    const numbers = new Set(state.tables.map(table => table.number)); let nextNumber = 1; while (numbers.has(nextNumber) && nextNumber < 999) nextNumber++;
    $('#create-table').elements.number.value = nextNumber;
  }
  function destinations(selectedGuest, targetTable, targetSeat) {
    form.elements.destination.innerHTML = '<option value="">Sin mesa asignada</option>' + state.tables.map(table => Array.from({ length: table.capacity }, (_, index) => {
      const seat = index + 1, occupant = state.assignments.find(item => item.tableId === table.id && item.seat === seat);
      if (occupant && occupant.guestId !== selectedGuest.id) return '';
      return `<option value="${esc(table.id)}|${seat}">${esc(tableLabel(table))} · Silla ${seat}</option>`;
    }).join('')).join('');
    const existing = assignmentFor(selectedGuest.id);
    form.elements.destination.value = targetTable ? targetTable + '|' + targetSeat : existing ? existing.tableId + '|' + existing.seat : '';
  }
  function choosePerson() {
    const guest = state.guests.find(person => person.id === form.elements.guestId.value);
    if (!guest) return;
    form.elements.displayName.value = guest.name;
    $('#seat-group').textContent = 'Confirmación de ' + guest.group;
    $('#seat-remove').hidden = !assignmentFor(guest.id);
    destinations(guest, form.dataset.table || '', Number(form.dataset.seat));
  }
  function openSeat(tableId, seat, guestId) {
    if (!state || saving) return;
    const occupied = state.assignments.find(item => item.tableId === tableId && item.seat === seat);
    const selected = guestId || occupied?.guestId;
    const candidates = state.guests.filter(guest => guest.id === selected || !assignmentFor(guest.id));
    if (!candidates.length) { status('Todavía no hay personas confirmadas pendientes de ubicar. Actualiza después de recibir nuevas respuestas.'); return; }
    form.dataset.table = tableId || ''; form.dataset.seat = String(seat || '');
    $('#seat-dialog-title').textContent = tableId ? `${tableLabel(state.tables.find(table => table.id === tableId))} · Silla ${seat}` : 'Elegir lugar';
    form.elements.guestId.innerHTML = candidates.map(guest => `<option value="${esc(guest.id)}">${esc(guest.name)}</option>`).join('');
    if (selected) form.elements.guestId.value = selected;
    form.elements.guestId.disabled = Boolean(occupied || guestId);
    $('#seat-error').textContent = ''; choosePerson(); dialog.showModal();
  }
  $('#tables-tab').addEventListener('click', () => { window.AdminSections.show('tables'); load(); });
  $('#refresh-seating').addEventListener('click', load);
  $('#seating-search').addEventListener('input', render);
  $('#create-table').addEventListener('submit', async event => {
    event.preventDefault(); if (!state || saving) return;
    const fields = event.currentTarget.elements;
    const next = structuredClone(state); next.tables.push({ id: crypto.randomUUID(), number: Number(fields.number.value), name: fields.name.value.trim(), capacity: Number(fields.capacity.value) });
    if (await commit(next)) { fields.name.value = ''; }
  });
  $('#table-cards').addEventListener('click', async event => {
    const seat = event.target.closest('.seat');
    if (seat) { openSeat(seat.dataset.table, Number(seat.dataset.seat)); return; }
    const remove = event.target.closest('.table-delete');
    if (!remove || saving) return;
    const next = structuredClone(state); next.tables = next.tables.filter(table => table.id !== remove.dataset.id); await commit(next);
  });
  $('#table-cards').addEventListener('submit', async event => {
    const editor = event.target.closest('.table-edit'); if (!editor) return;
    event.preventDefault(); if (saving) return;
    const next = structuredClone(state), table = next.tables.find(item => item.id === editor.dataset.id);
    table.name = editor.elements.name.value.trim(); table.capacity = Number(editor.elements.capacity.value); await commit(next);
  });
  $('#unassigned-list').addEventListener('click', event => { const button = event.target.closest('[data-guest]'); if (button) openSeat(null, null, button.dataset.guest); });
  form.elements.guestId.addEventListener('change', choosePerson);
  $('#seat-cancel').addEventListener('click', () => dialog.close());
  $('#seat-remove').addEventListener('click', async () => {
    const next = structuredClone(state); next.assignments = next.assignments.filter(item => item.guestId !== form.elements.guestId.value);
    if (await commit(next)) dialog.close();
  });
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (saving || !state) return;
    const guestId = form.elements.guestId.value, name = form.elements.displayName.value.trim();
    if (!name) { $('#seat-error').textContent = 'Escribe el nombre de la persona.'; return; }
    const next = structuredClone(state); next.names[guestId] = name;
    next.assignments = next.assignments.filter(item => item.guestId !== guestId);
    if (form.elements.destination.value) { const [tableId, seat] = form.elements.destination.value.split('|'); next.assignments.push({ guestId, tableId, seat: Number(seat) }); }
    if (await commit(next)) dialog.close();
  });
  $('#export-seating').addEventListener('click', () => {
    if (!state) return;
    const rows = [['Mesa', 'Nombre de mesa', 'Silla', 'Persona', 'Confirmación de'], ...state.tables.flatMap(table => Array.from({ length: table.capacity }, (_, index) => {
      const assigned = state.assignments.find(item => item.tableId === table.id && item.seat === index + 1), guest = state.guests.find(person => person.id === assigned?.guestId);
      return [table.number, table.name, index + 1, guest?.name || 'Libre', guest?.group || ''];
    })), ...state.guests.filter(guest => !assignmentFor(guest.id)).map(guest => ['Sin asignar', '', '', guest.name, guest.group])];
    const cell = value => '"' + String(value).replace(/^[\s]*[=+@-]/, match => "'" + match).replaceAll('"', '""') + '"';
    const url = URL.createObjectURL(new Blob(['\ufeff' + rows.map(row => row.map(cell).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'mesas-miller-daniela.csv'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  $('#print-seating').addEventListener('click', () => { $('#seating-search').value = ''; render(); window.print(); });
})();
