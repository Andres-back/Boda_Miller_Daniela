(() => {
  const form = document.querySelector('#login-form'), submit = document.querySelector('#login-submit'), error = document.querySelector('#login-error');
  let setup = false;
  document.querySelector('#show-password').addEventListener('click', event => {
    const input = form.elements.password, visible = input.type === 'password';
    input.type = visible ? 'text' : 'password'; event.currentTarget.textContent = visible ? 'Ocultar' : 'Mostrar'; event.currentTarget.setAttribute('aria-pressed', String(visible));
  });
  fetch('/api/auth/session', { cache: 'no-store', credentials: 'same-origin' }).then(async response => {
    if (![200, 401].includes(response.status)) throw new Error();
    const session = await response.json();
    if (session.authenticated) return location.replace('/admin');
    setup = session.setupAllowed === true;
    if (setup) {
      document.querySelector('#login-intro').textContent = 'Crea tu acceso privado. Elige un usuario y una contraseña de al menos 12 caracteres. Esta configuración inicial está disponible solo en este equipo.';
      document.querySelector('#confirm-label').hidden = false;
      form.elements.confirm.required = true;
      form.elements.password.minLength = 12;
      form.elements.password.autocomplete = 'new-password';
      form.elements.username.value = 'admin';
    }
    submit.textContent = setup ? 'Crear acceso privado' : 'Iniciar sesión'; submit.disabled = false;
  }).catch(() => { error.textContent = 'No se pudo comprobar el acceso. Actualiza la página para reintentar.'; });
  form.addEventListener('submit', async event => {
    event.preventDefault(); error.textContent = '';
    if (setup && form.elements.password.value !== form.elements.confirm.value) { error.textContent = 'Las contraseñas no coinciden.'; return; }
    submit.disabled = true;
    try {
      const response = await fetch('/api/auth/' + (setup ? 'setup' : 'login'), { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Boda-Request': '1' }, body: JSON.stringify({ username: form.elements.username.value.trim(), password: form.elements.password.value }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'No se pudo iniciar sesión.');
      form.reset(); location.replace('/admin');
    } catch (failure) { error.textContent = failure.message || 'No se pudo conectar. Inténtalo de nuevo.'; submit.disabled = false; }
  });
})();
