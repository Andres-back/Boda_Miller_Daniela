(() => {
  let session;
  const ready = fetch('/api/auth/session', { cache: 'no-store', credentials: 'same-origin' }).then(async response => {
    if (response.status === 401) { location.replace('/admin/login'); throw new Error('Inicia sesión para continuar.'); }
    if (!response.ok) throw new Error('No se pudo comprobar la sesión.');
    session = await response.json();
    document.querySelector('#admin-username').textContent = session.username;
    document.querySelector('#account-username').textContent = session.username;
    return session;
  });
  ready.catch(() => {});
  async function request(url, options = {}) {
    await ready;
    const headers = new Headers(options.headers);
    headers.set('X-Boda-Request', '1'); headers.set('X-CSRF-Token', session.csrf);
    const response = await fetch(url, { ...options, credentials: 'same-origin', cache: 'no-store', headers });
    if (response.status === 401) { location.replace('/admin/login'); throw new Error('La sesión terminó. Vuelve a iniciar sesión.'); }
    return response;
  }
  window.AdminAccess = { ready, fetch: request };
  document.querySelector('#logout-button').addEventListener('click', async () => {
    if (document.querySelector('.status-dot.dirty') && !confirm('Tienes cambios de la invitación sin guardar. ¿Cerrar sesión?')) return;
    try { const response = await request('/api/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }); if (!response.ok) throw new Error(); location.replace('/admin/login'); } catch { alert('No se pudo cerrar sesión. Inténtalo de nuevo.'); }
  });
  const dialog = document.querySelector('#password-dialog'), form = document.querySelector('#password-form');
  document.querySelector('#password-button').addEventListener('click', () => { form.reset(); document.querySelector('#password-error').textContent = ''; dialog.showModal(); });
  document.querySelector('#password-cancel').addEventListener('click', () => dialog.close());
  form.addEventListener('submit', async event => {
    event.preventDefault(); const error = document.querySelector('#password-error'); error.textContent = '';
    if (form.elements.password.value !== form.elements.confirm.value) { error.textContent = 'Las contraseñas no coinciden.'; return; }
    const button = form.querySelector('[type=submit]'); button.disabled = true;
    try {
      const response = await request('/api/auth/password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword: form.elements.currentPassword.value, password: form.elements.password.value }) });
      const next = await response.json(); if (!response.ok) throw new Error(next.error);
      session = next; form.reset(); dialog.close(); alert('Contraseña actualizada. Se cerraron las demás sesiones.');
    } catch (failure) { error.textContent = failure.message || 'No se pudo cambiar la contraseña.'; } finally { button.disabled = false; }
  });
})();
