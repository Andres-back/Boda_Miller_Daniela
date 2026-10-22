(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let content, selected = 'hero', dirty = false, guests = [], previewReady = false, updateTimer, toastTimer, saving = false, revision = 0;
  let suppressPreviewSync = false, syncTimer;
  const fieldGroupState = new Map();
  const descriptions = {
    hero: 'La primera impresión de su historia. Nombres, fecha y una bienvenida inolvidable.',
    countdown: 'La emoción de contar los días. La fecha se toma automáticamente de la portada.',
    illustrations: 'Su versión ilustrada en tres escenas. Cambia los textos y los PNG; la llegada, los anillos y la celebración se animan automáticamente en la invitación.',
    welcome: 'Su invitación, en sus propias palabras. Un mensaje especial para quienes aman.',
    celebration: 'Dónde, cuándo y cómo celebrarán. Cada momento de su gran día.',
    gallery: 'Sus recuerdos, en un álbum. Las tres primeras fotos se muestran en la página y el álbum completo se abre al pulsarlas.',
    details: 'Todo lo que sus invitados necesitan saber para disfrutar sin preocupaciones.',
    rsvp: 'Un lugar para cada persona especial. Personaliza la confirmación y el contacto.'
  };
  const fields = {
    illustrations: [ ['label', 'Nombre del módulo'], ['eyebrow', 'Texto superior'], ['title', 'Título', 'textarea'], ['text', 'Introducción', 'textarea'], ...['car', 'rings', 'dance'].flatMap((scene, i) => [[scene + 'Label', `Escena ${i + 1} · botón`], [scene + 'Title', `Escena ${i + 1} · título`], [scene + 'Text', `Escena ${i + 1} · mensaje`, 'textarea'], [scene + 'Image', `Escena ${i + 1} · ilustración PNG`, 'image', 'Usa un PNG transparente para conservar la composición.']]) ],
    hero: [ ['label', 'Nombre del módulo'], ['groom', 'Nombre corto del novio'], ['bride', 'Nombre corto de la novia'], ['groomFull', 'Nombre completo del novio'], ['brideFull', 'Nombre completo de la novia'], ['eyebrow', 'Texto superior'], ['subtitle', 'Mensaje de bienvenida', 'textarea'], ['date', 'Fecha y hora de la boda', 'datetime-local', 'Hora de Colombia (UTC−5). Actualiza también la cuenta regresiva y el calendario.'], ['location', 'Lugar en la portada'], ['image', 'Ilustración principal de los novios', 'image'], ['button', 'Texto del botón'] ],
    countdown: [ ['label', 'Nombre del módulo'], ['eyebrow', 'Texto superior'], ['title', 'Título'], ['message', 'Mensaje cuando llegue el gran día'], ['scratchTitle', 'Rasca la cuenta regresiva · título', 'text', 'El tiempo restante aparece debajo del dorado. Déjalo vacío para mostrar el contador directamente. La fecha se toma de la portada.'], ['scratchHint', 'Rasca la cuenta regresiva · instrucción'], ['scratchReveal', 'Rasca la cuenta regresiva · mensaje revelado'] ],
    welcome: [ ['label', 'Nombre del módulo'], ['eyebrow', 'Texto superior'], ['title', 'Título', 'textarea'], ['text', 'La invitación', 'textarea'], ['quote', 'Frase especial', 'textarea'], ['image', 'Fotografía de la sección', 'image'], ['letter', 'Carta para los invitados', 'textarea', 'Puedes usar saltos de línea para separar los párrafos.'] ],
    celebration: [ ['label', 'Nombre del módulo'], ['eyebrow', 'Texto superior'], ['title', 'Título'], ['venue', 'Nombre de la iglesia o lugar'], ['address', 'Barrio y dirección'], ['note', 'Descripción del lugar', 'textarea'], ['mapUrl', 'Enlace de Google Maps', 'url', 'Pega un enlace https://. El botón aparecerá cuando agregues la ubicación.'], ['image', 'Imagen del lugar', 'image'], ['timelineNote', 'Nota sobre el itinerario', 'textarea'], ['arrivalTime', 'Llegada · hora', 'time'], ['arrivalTitle', 'Llegada · título'], ['arrivalText', 'Llegada · descripción', 'textarea'], ['ceremonyTime', 'Ceremonia · hora', 'time'], ['ceremonyTitle', 'Ceremonia · título'], ['ceremonyText', 'Ceremonia · descripción', 'textarea'], ['memoriesTime', 'Felicitaciones y recuerdos · hora', 'time'], ['memoriesTitle', 'Felicitaciones y recuerdos · título'], ['memoriesText', 'Felicitaciones y recuerdos · descripción', 'textarea'], ['dinnerTime', 'Cena · hora de inicio', 'time'], ['dinnerEndTime', 'Cena · hora de finalización', 'time'], ['dinnerTitle', 'Cena · título'], ['dinnerText', 'Cena · descripción', 'textarea'] ],
    gallery: [ ['label', 'Nombre del módulo'], ['eyebrow', 'Texto superior'], ['title', 'Título'], ['text', 'Descripción'], ['image1', 'Primera fotografía', 'image'], ['image2', 'Segunda fotografía', 'image'], ['image3', 'Tercera fotografía', 'image'], ['caption', 'Texto al pie de la galería'] ],
    details: [ ['label', 'Nombre del módulo'], ['eyebrow', 'Texto superior'], ['title', 'Título'], ['dressTitle', 'Vestimenta · título'], ['dressText', 'Vestimenta · indicaciones', 'textarea'], ['giftTitle', 'Regalos · título'], ['giftText', 'Regalos · indicaciones', 'textarea'] ],
    rsvp: [ ['label', 'Nombre del módulo'], ['eyebrow', 'Texto superior'], ['title', 'Título', 'textarea'], ['text', 'Mensaje', 'textarea'], ['deadline', 'Fecha límite de confirmación', 'date'], ['thanks', 'Mensaje después de confirmar', 'textarea'], ['whatsapp', 'WhatsApp de contacto', 'tel', 'Número internacional, solo dígitos. Ejemplo para Colombia: 573215673010.'] ]
  };
  for (const [id, copy] of Object.entries(window.BodaModuleCopy.modules)) fields[id].push(...copy.map(field => [field.key, field.label, field.value.length > 110 ? 'textarea' : 'text']));
  fields.hero.push(
    ['musicUrl', 'Nuestra canción · enlace de YouTube', 'url', 'Pega el enlace del video. Déjalo vacío para ocultar el botón de música.'],
    ['musicStart', 'Nuestra canción · comenzar en', 'text', 'Minuto y segundo, por ejemplo 1:53. También puedes escribir los segundos: 113. El botón reproduce o pausa la música de fondo, sin abrir el video.']);
  fields.hero.splice(fields.hero.findIndex(field => field[0] === 'button'), 0,
    ['accentImage', 'Fotografía del enlace al álbum', 'image'],
    ['photoCaption', 'Frase sobre la fotografía']);
  fields.hero.push(['openingEyebrow', 'Sobre de bienvenida · texto superior'], ['openingMessage', 'Sobre de bienvenida · mensaje', 'textarea', 'El sobre aparece al entrar por primera vez. Los nombres y la fecha se toman de esta portada.']);
  fields.hero.push(['welcomeTitle', 'Bienvenida · título'], ['welcomeMessage', 'Bienvenida · mensaje a los invitados', 'textarea'], ['welcomeClosing', 'Bienvenida · despedida'], ['welcomeCrestImage', 'Bienvenida · adorno de palomas', 'image', 'PNG transparente. Aparece sobre el mensaje de bienvenida.']);
  fields.gallery.splice(fields.gallery.findIndex(field => field[0] === 'caption'), 0,
    ...Array.from({ length: 11 }, (_, i) => ['image' + (i + 4), `Álbum · fotografía ${i + 4}`, 'image', 'Déjala vacía para omitirla del álbum.']));
  fields.gallery.find(field => field[0] === 'title')[2] = 'textarea';
  fields.gallery.find(field => field[0] === 'text')[2] = 'textarea';
  function toast(message) { clearTimeout(toastTimer); $('#admin-toast').textContent = message; $('#admin-toast').classList.add('show'); toastTimer = setTimeout(() => $('#admin-toast').classList.remove('show'), 4500); }
  function markDirty() { dirty = true; revision++; $('.status-dot').classList.add('dirty'); $('#pending-edit-indicator').hidden = false; $('#save-status').textContent = 'Cambios sin guardar'; $('#save-button').disabled = false; }
  function module() { return content.modules.find(m => m.id === selected); }
  function updatePreview(select = false) {
    if (!previewReady) return;
    const hero = content.modules.find(m => m.id === 'hero'), rsvp = content.modules.find(m => m.id === 'rsvp');
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(hero.date) || !/^\d{4}-\d{2}-\d{2}$/.test(rsvp.deadline)) return;
    $('#preview').contentWindow.postMessage({ type: 'boda:update', content, id: select && module().enabled ? selected : null }, location.origin);
  }
  function schedulePreview() { clearTimeout(updateTimer); updateTimer = setTimeout(() => updatePreview(false), 230); }
  function listModules() {
    $('#module-select').innerHTML = content.modules.map((m, i) => `<option value="${esc(m.id)}" ${m.id === selected ? 'selected' : ''}>${String(i + 1).padStart(2, '0')} · ${esc(m.label)}${m.enabled ? '' : ' · Oculta'}</option>`).join('');
  }
  $('#module-select').addEventListener('change', event => selectModule(event.target.value, true));
  function groupName(key, type) {
    const copyField = window.BodaModuleCopy.modules[selected]?.find(field => field.key === key);
    if (copyField) return copyField.group;
    if (key === 'decorationImage') return 'Decoración de la sección';
    if (selected === 'hero') {
      if (key.startsWith('music')) return 'Música de fondo';
      if (key.startsWith('opening')) return 'Sobre de inicio';
      if (type === 'image' || key === 'photoCaption') return 'Fotografías e ilustraciones';
      if (['eyebrow', 'subtitle', 'button', 'welcomeTitle', 'welcomeMessage', 'welcomeClosing'].includes(key)) return 'Mensajes de bienvenida';
      return 'Los novios, la fecha y el lugar';
    }
    if (selected === 'celebration') return /^(arrival|ceremony|memories|dinner)/.test(key) ? 'Horarios del día' : 'Lugar y ubicación';
    if (selected === 'illustrations') {
      for (const [prefix, name] of [['car', 'Escena 1 · La llegada'], ['rings', 'Escena 2 · El sí'], ['dance', 'Escena 3 · La alegría']]) if (key.startsWith(prefix)) return name;
    }
    if (selected === 'details') { if (key.startsWith('dress')) return 'Vestimenta'; if (key.startsWith('gift')) return 'Regalos'; }
    if (key === 'whatsapp') return 'Contacto de confirmación';
    if (key.startsWith('scratch')) return 'Rascado para revelar la fecha';
    if (type === 'image') return selected === 'gallery' ? 'Fotografías del álbum' : 'Imágenes';
    return 'Textos y ajustes';
  }
  function safeImage(value) { try { if (/^\/assets\/[\w.-]+$/.test(value) || new URL(value).protocol === 'https:') return value; } catch {} return '/assets/garden.webp'; }
  function decorationPicker(m) {
    const choices = [
      { value: '/assets/flores-marfil-salvia-v3.png', label: 'Flores marfil y salvia' },
      { value: '/assets/floral-garland.png', label: 'Guirnalda marfil y verde' },
      { value: '', label: 'Sin adorno' }
    ];
    if (m.decorationImage && !choices.some(choice => choice.value === m.decorationImage)) choices.push({ value: m.decorationImage, label: 'Mi adorno' });
    return `<fieldset class="ornament-picker"><legend>Adorno de esta sección</legend><p>Elige el que más te guste. Siempre permanece fijo.</p><div class="ornament-options">${choices.map(choice => `<button type="button" class="ornament-choice ${m.decorationImage === choice.value ? 'selected' : ''}" data-decoration="${esc(choice.value)}" aria-pressed="${m.decorationImage === choice.value}"><span class="ornament-thumbnail">${choice.value ? `<img src="${esc(safeImage(choice.value))}" alt="">` : '<span class="ornament-none" aria-hidden="true">∅</span>'}</span><span class="ornament-name">${choice.label}</span><span class="ornament-check" aria-hidden="true">✓</span></button>`).join('')}</div><label class="edit-field ornament-upload">O sube tu propio adorno PNG<input type="file" accept="image/png" data-upload="decorationImage"><span class="field-hint">PNG con fondo transparente · hasta 8 MB.</span></label></fieldset>`;
  }
  function renderFields() {
    const m = module(), index = content.modules.findIndex(m => m.id === selected);
    $('#module-number').textContent = `MÓDULO ${String(index + 1).padStart(2, '0')}`;
    $('#module-title').textContent = m.label;
    $('#module-description').textContent = descriptions[selected];
    $('#module-enabled').checked = m.enabled;
    $('#module-enabled').disabled = ['hero', 'rsvp'].includes(selected);
    $('#module-enabled').title = ['hero', 'rsvp'].includes(selected) ? 'La portada y la confirmación siempre están visibles.' : '';
    $('#move-up').disabled = index <= 1 || selected === 'hero' || selected === 'rsvp';
    $('#move-down').disabled = index >= content.modules.length - 2 || selected === 'hero' || selected === 'rsvp';
    $('#demo-enabled').checked = content.demo;
    const grouped = new Map();
    [...fields[selected], ['decorationImage', 'Adorno de la sección · PNG sin fondo', 'image']].forEach(([key, label, type = 'text', hint]) => {
      const value = m[key] || '';
      const group = groupName(key, type);
      if (!grouped.has(group)) grouped.set(group, []);
      if (key === 'decorationImage') { grouped.get(group).push(decorationPicker(m)); return; }
      const required = ['date', 'deadline', 'groom', 'bride', 'label'].includes(key) || (type === 'time' && key !== 'dinnerEndTime') ? 'required' : '';
      if (type === 'time' && !hint) hint = key === 'ceremonyTime' ? '5:00 p. m. equivale a 17:00. Al cambiar esta hora también se actualizan la portada, la cuenta regresiva y el calendario.' : 'Selecciona la hora y los minutos. Si aparece AM/PM, elige p. m. para la tarde.';
      const input = type === 'textarea' ? `<textarea data-key="${key}" rows="${key === 'letter' ? 9 : 3}" maxlength="12000">${esc(value)}</textarea>` : `<input data-key="${key}" type="${type === 'image' ? 'text' : type}" value="${esc(value)}" ${required} ${type === 'time' ? 'step="60"' : ''} maxlength="${type === 'image' ? 3000 : 12000}" ${type === 'url' ? 'placeholder="https://…"' : ''}>`;
      grouped.get(group).push(`<label class="edit-field">${esc(label)}${input}${hint ? `<span class="field-hint">${esc(hint)}</span>` : ''}</label>${type === 'image' ? `<img class="field-image-preview" src="${esc(safeImage(value))}" alt="Vista previa de ${esc(label)}" ${value ? '' : 'hidden'}><label class="edit-field">O sube una imagen desde tu equipo<input type="file" accept="image/png,image/jpeg,image/webp" data-upload="${key}"><span class="field-hint">PNG, JPG o WebP · hasta 8 MB.</span></label>` : ''}`);
    });
    const groups = [...grouped];
    if (selected === 'celebration') groups.sort(([a], [b]) => Number(b === 'Horarios del día') - Number(a === 'Horarios del día'));
    $('#fields-form').innerHTML = groups.map(([name, html], groupIndex) => {
      const stateKey = selected + ':' + name, open = fieldGroupState.has(stateKey) ? fieldGroupState.get(stateKey) : groupIndex === 0;
      return `<details class="field-group" data-state-key="${esc(stateKey)}" ${open ? 'open' : ''}><summary><span>${esc(name)}</span><i aria-hidden="true">+</i></summary><div class="field-group-body">${html.join('')}</div></details>`;
    }).join('');
    $$('#fields-form .field-group').forEach(group => group.addEventListener('toggle', () => fieldGroupState.set(group.dataset.stateKey, group.open)));
    $$('#fields-form [data-key]').forEach(input => input.addEventListener('input', () => {
      if (!applyFieldEdit(m, input.dataset.key, input.value)) return;
      markDirty(); schedulePreview();
      if (input.dataset.key === 'label') { $('#module-title').textContent = input.value; listModules(); }
      if (['groom', 'bride'].includes(input.dataset.key)) updateCouple();
      if (input.dataset.key.endsWith('Image') || input.dataset.key === 'image' || input.dataset.key.startsWith('image')) { const preview = input.closest('label').nextElementSibling; if (preview?.tagName === 'IMG') { preview.src = safeImage(input.value); preview.hidden = !input.value; } }
    }));
    $$('#fields-form [data-decoration]').forEach(button => button.addEventListener('click', () => {
      const value = button.dataset.decoration;
      m.decorationImage = value; markDirty(); renderFields();
      $$('#fields-form [data-decoration]').find(choice => choice.dataset.decoration === value)?.focus({ preventScroll: true });
      updatePreview(true);
    }));
    $$('#fields-form [data-upload]').forEach(input => input.addEventListener('change', () => uploadImage(input, m)));
    if (selected === 'hero') {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'preview-envelope-button'; button.textContent = 'Ver el sobre en la vista previa';
      button.addEventListener('click', () => { window.AdminSections.workspace('preview'); updatePreview(false); $('#preview').contentWindow.postMessage({ type: 'boda:envelope' }, location.origin); });
      $('#fields-form').append(button);
    }
    updatePreviewFooter();
  }
  function applyFieldEdit(owner, key, value) {
    const field = fields[owner.id]?.find(field => field[0] === key);
    // Native time controls briefly report an empty value while a part is being typed.
    if (field?.[2] === 'time' && !(key === 'dinnerEndTime' && value === '') && !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return false;
    owner[key] = value;
    if (owner.id === 'hero' && key === 'date' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) content.modules.find(m => m.id === 'celebration').ceremonyTime = value.slice(11, 16);
    if (owner.id === 'celebration' && key === 'ceremonyTime') { const cover = content.modules.find(m => m.id === 'hero'); cover.date = cover.date.slice(0, 11) + value; }
    return true;
  }
  function editPreviewField(id, key) {
    if (!fields[id]?.some(field => field[0] === key) || !content.modules.some(m => m.id === id)) return;
    selectModule(id, false);
    window.AdminSections.workspace('edit');
    const input = $$('#fields-form [data-key]').find(input => input.dataset.key === key);
    if (!input) return;
    const group = input.closest('.field-group');
    if (group) { group.open = true; fieldGroupState.set(group.dataset.stateKey, true); }
    input.scrollIntoView({ block: 'center', behavior: 'instant' });
    input.focus({ preventScroll: true });
  }
  function updateCouple() { const hero = content.modules.find(m => m.id === 'hero'); $('.admin-couple').innerHTML = `${esc(hero.groom)} <em>&</em> ${esc(hero.bride)}`; }
  function updatePreviewFooter() { const index = content.modules.findIndex(m => m.id === selected); $('#preview-section').textContent = `${String(index + 1).padStart(2, '0')} / ${module().label}${module().enabled ? '' : ' · oculto'}`; }
  function selectModule(id, scroll = false) {
    if (!content.modules.some(m => m.id === id)) return;
    selected = id; showModules(); listModules(); renderFields();
    $('.editor').scrollTop = 0;
    if (scroll && previewReady && module().enabled) {
      suppressPreviewSync = true; clearTimeout(syncTimer); syncTimer = setTimeout(() => suppressPreviewSync = false, 700);
      $('#preview').contentWindow.postMessage({ type: 'boda:select', id }, location.origin);
    }
  }
  function showModules() { window.AdminSections.show('modules'); }
  async function uploadImage(input, owner) {
    const file = input.files[0]; if (!file) return;
    if (input.dataset.upload === 'decorationImage' && file.type !== 'image/png') { toast('Elige un archivo PNG para el adorno.'); input.value = ''; return; }
    if (file.size > 8 * 1024 * 1024) { toast('La imagen debe pesar menos de 8 MB.'); input.value = ''; return; }
    input.disabled = true;
    try {
      const response = await window.AdminAccess.fetch('/api/upload', { method: 'POST', headers: { 'Content-Type': file.type }, body: file });
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      owner[input.dataset.upload] = result.url; markDirty(); if (owner.id === selected) renderFields(); updatePreview(); toast('Imagen cargada. Guarda para aplicar el cambio a la invitación.');
    } catch (error) { toast(error.message || 'No fue posible subir la imagen.'); input.disabled = false; }
  }
  async function save() {
    if (saving || !dirty) return;
    if (!$('#fields-form').checkValidity()) { showModules(); window.AdminSections.workspace('edit'); $('#fields-form').reportValidity(); return; }
    const hero = content.modules.find(m => m.id === 'hero'), rsvp = content.modules.find(m => m.id === 'rsvp');
    if (!hero.groom.trim() || !hero.bride.trim() || !hero.date || !rsvp.deadline || (rsvp.whatsapp && !/^\d{8,15}$/.test(rsvp.whatsapp))) { toast('Revisa los nombres, las fechas y el WhatsApp (solo dígitos).'); return; }
    saving = true; const savedRevision = revision; $('#save-button').disabled = true; $('#save-button').textContent = 'Guardando…';
    try {
      const response = await window.AdminAccess.fetch('/api/content', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(content) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      if (revision === savedRevision) { dirty = false; $('.status-dot').classList.remove('dirty'); $('#pending-edit-indicator').hidden = true; $('#save-status').textContent = 'Todos los cambios guardados'; }
      toast('Invitación actualizada. Los cambios ya están guardados en el proyecto.');
    } catch (error) { toast(error.message || 'No fue posible guardar. Tus cambios siguen en el editor.'); }
    finally { saving = false; $('#save-button').innerHTML = 'Guardar cambios'; $('#save-button').disabled = !dirty; }
  }
  function download(value, type, name) { const url = URL.createObjectURL(new Blob([value], { type })); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
  async function loadGuests() {
    window.AdminSections.show('guests');
    $('#guest-list').innerHTML = '<p class="empty-state">Cargando respuestas…</p>';
    try {
      const response = await window.AdminAccess.fetch('/api/rsvps', { cache: 'no-store' }); if (!response.ok) throw new Error(); guests = await response.json();
      const confirmed = guests.filter(g => g.attendance === 'yes'), total = confirmed.reduce((sum, g) => sum + g.guests, 0);
      $('.guest-summary').innerHTML = [[guests.length, 'Respuestas'], [total, 'Asistentes'], [guests.length - confirmed.length, 'No asistirán']].map(([n, label]) => `<div class="guest-stat"><strong>${n}</strong><span>${label}</span></div>`).join('');
      $('#guest-list').innerHTML = guests.length ? guests.slice().reverse().map(g => `<article class="guest-card"><h3>${esc(g.name)}</h3><span class="guest-badge ${g.attendance === 'no' ? 'no' : ''}">${g.attendance === 'yes' ? `Asistirá · ${g.guests} ${g.guests === 1 ? 'persona' : 'personas'}` : 'No podrá asistir'}</span>${g.companions?.length ? `<p>Acompañantes: ${g.companions.map(esc).join(', ')}</p>` : ''}${g.message ? `<p>“${esc(g.message)}”</p>` : ''}<small>${new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' }).format(new Date(g.createdAt))}</small></article>`).join('') : '<div class="empty-state"><span>♡</span>Los primeros “¡allí estaremos!”<br>aparecerán aquí.</div>';
    } catch { $('#guest-list').innerHTML = '<p class="admin-error">No se pudieron cargar las respuestas. Pulsa Actualizar para volver a intentar.</p>'; }
  }
  $('#save-button').addEventListener('click', save);
  $('#fields-form').addEventListener('submit', e => { e.preventDefault(); save(); });
  $('#module-enabled').addEventListener('change', e => { module().enabled = e.target.checked; markDirty(); listModules(); updatePreview(); updatePreviewFooter(); });
  $('#demo-enabled').addEventListener('change', e => { content.demo = e.target.checked; markDirty(); updatePreview(); });
  function move(delta) { const index = content.modules.findIndex(m => m.id === selected), target = index + delta; if (index === 0 || index === content.modules.length - 1 || target <= 0 || target >= content.modules.length - 1) return; [content.modules[index], content.modules[target]] = [content.modules[target], content.modules[index]]; markDirty(); listModules(); renderFields(); updatePreview(true); }
  $('#move-up').addEventListener('click', () => move(-1)); $('#move-down').addEventListener('click', () => move(1));
  $('#modules-tab').addEventListener('click', () => { showModules(); window.AdminSections.workspace('edit'); }); $('#guests-tab').addEventListener('click', loadGuests); $('#refresh-guests').addEventListener('click', loadGuests);
  $('#fields-form').addEventListener('invalid', event => { const group = event.target.closest('details'); if (group) group.open = true; }, true);
  $$('[data-device]').forEach(button => button.addEventListener('click', () => { $$('[data-device]').forEach(b => { b.classList.toggle('active', b === button); b.setAttribute('aria-pressed', b === button); }); $('#preview').classList.toggle('mobile', button.dataset.device === 'mobile'); }));
  $('#refresh-preview').addEventListener('click', () => { previewReady = false; $('#preview').src = '/?preview=1'; });
  $('#export-content').addEventListener('click', () => { if (content) download(JSON.stringify(content, null, 2), 'application/json', 'invitacion-miller-daniela.json'); });
  $('#import-content').addEventListener('change', async event => {
    const file = event.target.files[0]; if (!file) return;
    try {
      if (file.size > 200000) throw new Error('El archivo es demasiado grande.');
      const next = window.BodaModuleCopy.upgrade(JSON.parse(await file.text()));
      if (typeof next.demo !== 'boolean' || !Array.isArray(next.modules) || next.modules.length !== content.modules.length) throw new Error('Este archivo no tiene el formato de la invitación.');
      const ids = new Set();
      for (const m of next.modules) {
        const original = content.modules.find(o => o.id === m.id);
        if (!original || ids.has(m.id) || Object.keys(original).sort().join() !== Object.keys(m).sort().join() || typeof m.enabled !== 'boolean' || !Object.entries(m).every(([k, v]) => k === 'enabled' || typeof v === 'string')) throw new Error('Los módulos no corresponden a esta invitación.');
        ids.add(m.id);
      }
      if (!next.modules.find(m => m.id === 'hero').enabled || !next.modules.find(m => m.id === 'rsvp').enabled) throw new Error('La portada y la confirmación deben estar visibles.');
      next.modules.sort((a, b) => a.id === 'hero' ? -1 : b.id === 'hero' ? 1 : a.id === 'rsvp' ? 1 : b.id === 'rsvp' ? -1 : 0);
      content = next; markDirty(); listModules(); renderFields(); updateCouple(); showModules(); window.AdminSections.workspace('edit'); updatePreview(true); toast('Contenido importado. Revisa la vista previa y guarda los cambios.');
    } catch (error) { toast(error.message || 'No fue posible importar el archivo.'); } finally { event.target.value = ''; }
  });
  $('#export-guests').addEventListener('click', () => {
    if (!guests.length) return toast('Todavía no hay respuestas para exportar.');
    const csvCell = value => '"' + String(value ?? '').replace(/^[=+@\-\t\r]/, match => "'" + match).replaceAll('"', '""') + '"';
    const rows = [['Nombre', 'Asistencia', 'Personas', 'Acompañantes', 'Mensaje', 'Recibido'], ...guests.map(g => [g.name, g.attendance === 'yes' ? 'Sí' : 'No', g.guests, (g.companions || []).join(' / '), g.message, g.createdAt])];
    download('\ufeff' + rows.map(row => row.map(csvCell).join(';')).join('\r\n'), 'text/csv;charset=utf-8', 'respuestas-boda.csv');
  });
  addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== $('#preview').contentWindow || !content) return;
    if (event.data.type === 'boda:ready') { previewReady = true; updatePreview(true); }
    if (event.data.type === 'boda:edit-field') editPreviewField(event.data.id, event.data.key);
    if (event.data.type === 'boda:section' && !suppressPreviewSync) {
      const id = event.data.id;
      if (id !== selected && !$('#module-editor').hidden && (event.data.interactive || !$('#fields-form').contains(document.activeElement))) selectModule(id, false);
    }
  });
  addEventListener('beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
  addEventListener('keydown', event => { if ((event.ctrlKey || event.metaKey) && event.key === 's') { event.preventDefault(); save(); } });
  window.AdminAccess.fetch('/api/content', { cache: 'no-store' }).then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(data => { content = data; listModules(); renderFields(); updateCouple(); $('#save-status').textContent = 'Todos los cambios guardados'; const destination = { '#mesas': 'tables-tab', '#confirmaciones': 'guests-tab', '#cuenta': 'account-tab' }[location.hash]; if (destination) document.getElementById(destination).click(); else showModules(); if ($('#preview').contentDocument?.querySelector('[data-module]')) { previewReady = true; updatePreview(true); } }).catch(() => { $('.editor').innerHTML = '<div class="admin-error">No se pudo abrir la invitación. Asegúrate de iniciar el proyecto con npm start y vuelve a cargar esta página.</div>'; $('#save-status').textContent = 'Sin conexión al proyecto'; });
})();
