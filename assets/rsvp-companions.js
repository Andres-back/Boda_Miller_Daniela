(() => {
  'use strict';
  window.BodaCompanions = {
    init(form, { onChange = () => {}, nameLabel = 'Nombre completo del acompañante', namePlaceholder = 'Nombre y apellido' } = {}) {
      const countInput = form.elements.guests;
      const container = form.querySelector('.companion-fields');
      const list = form.querySelector('.companion-names');
      const status = form.querySelector('.companion-count');
      const minus = form.querySelector('[data-guest-step="-1"]');
      const plus = form.querySelector('[data-guest-step="1"]');
      const draft = [];
      function sync() {
        for (const input of list.querySelectorAll('input')) draft[Number(input.dataset.companion)] = input.value;
        const attending = form.elements.attendance.value === 'yes';
        const count = Number(countInput.value);
        const extra = attending && Number.isInteger(count) && count >= 1 && count <= 8 ? count - 1 : 0;
        minus.disabled = count <= 1;
        plus.disabled = count >= 8;
        form.querySelector('.guest-field').hidden = !attending;
        container.hidden = extra === 0;
        status.textContent = extra === 1 ? '1 acompañante' : `${extra} acompañantes`;
        // Keep existing inputs when the count is unchanged, preserving typing and focus.
        while (list.children.length > extra) list.lastElementChild.remove();
        for (let index = list.children.length; index < extra; index++) {
          const label = document.createElement('label'); label.className = 'field companion-field';
          const caption = document.createElement('span'); caption.textContent = `${nameLabel} ${index + 1}`;
          const input = document.createElement('input'); input.type = 'text'; input.required = true; input.maxLength = 100;
          input.name = 'companion-' + index; input.dataset.companion = String(index);
          input.placeholder = namePlaceholder; input.autocomplete = 'off'; input.value = draft[index] || '';
          input.addEventListener('input', () => { draft[index] = input.value; input.setCustomValidity(input.value.trim() ? '' : 'Escribe el nombre de esta persona.'); });
          label.append(caption, input); list.append(label);
        }
        onChange();
      }
      for (const button of [minus, plus]) button.addEventListener('click', () => {
        countInput.value = String(Math.max(1, Math.min(8, Number(countInput.value || 1) + Number(button.dataset.guestStep)))); sync();
      });
      countInput.addEventListener('input', sync);
      form.addEventListener('change', event => { if (event.target.name === 'attendance') sync(); });
      sync();
      return { names: () => [...list.querySelectorAll('input')].map(input => input.value.trim()) };
    }
  };
})();
