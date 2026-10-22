import crypto from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(crypto.scrypt);
const passwordOptions = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const safeEqual = (a, b) => crypto.timingSafeEqual(Buffer.from(digest(a), 'hex'), Buffer.from(digest(b), 'hex'));
export async function passwordHash(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = await scrypt(password, salt, 64, passwordOptions);
  return { salt, hash: hash.toString('hex') };
}
export async function createAuth({ readJSON, atomicJSON, production }) {
  let account = null, busy = 0, settingUp = false;
  try { account = await readJSON('admin-auth.json'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (account && (!/^[\w.@-]{3,64}$/.test(account.username) || !/^[a-f0-9]{32}$/.test(account.salt) || !/^[a-f0-9]{128}$/.test(account.hash))) throw new Error('La cuenta del administrador no es válida.');
  if (production && !account) throw new Error('Configura primero la cuenta en localhost y conserva data/admin-auth.json en almacenamiento privado persistente.');
  const sessions = new Map(), attempts = new Map();
  const cookieName = production ? '__Host-boda_session' : 'boda_session';
  const lifetime = 8 * 60 * 60 * 1000;
  const cookie = (token, age = lifetime / 1000) => `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${production ? '; Secure' : ''}`;
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, value] of sessions) if (value.expires <= now || value.last + 30 * 60 * 1000 <= now) sessions.delete(key);
    for (const [key, value] of attempts) if (value.until <= now) attempts.delete(key);
  }, 60000);
  cleanup.unref();
  function get(req) {
    const token = (req.headers.cookie || '').split(';').map(part => part.trim()).find(part => part.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
    if (!/^[\w-]{43}$/.test(token || '')) return null;
    const key = digest(token), session = sessions.get(key);
    if (!session) return null;
    if (session.expires <= Date.now() || session.last + 30 * 60 * 1000 <= Date.now()) { sessions.delete(key); return null; }
    session.last = Date.now();
    return { ...session, key };
  }
  function localSetup(req) {
    return !production && !account && ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress) && ['localhost', '127.0.0.1'].includes((req.headers.host || '').split(':')[0]);
  }
  function issue(res) {
    if (sessions.size >= 100) sessions.delete(sessions.keys().next().value);
    const token = crypto.randomBytes(32).toString('base64url'), now = Date.now();
    const session = { username: account.username, csrf: crypto.randomBytes(32).toString('base64url'), expires: now + lifetime, last: now };
    sessions.set(digest(token), session);
    res.setHeader('Set-Cookie', cookie(token));
    return { authenticated: true, username: session.username, csrf: session.csrf };
  }
  async function handle(req, res, pathname, { body, reply, originAllowed }) {
    if (!pathname.startsWith('/api/auth/')) return false;
    const session = get(req);
    if (pathname === '/api/auth/session' && req.method === 'GET') {
      reply(res, session ? 200 : 401, session ? { authenticated: true, username: session.username, csrf: session.csrf } : { authenticated: false, setupAllowed: localSetup(req) });
      return true;
    }
    if (req.method !== 'POST') { reply(res, 405, { error: 'Acción no disponible.' }); return true; }
    if (!originAllowed(req) || req.headers['x-boda-request'] !== '1' || !req.headers['content-type']?.startsWith('application/json')) { reply(res, 403, { error: 'Solicitud no permitida.' }); return true; }
    if (['/api/auth/logout', '/api/auth/password'].includes(pathname)) {
      if (!session) { reply(res, 401, { error: 'Inicia sesión para continuar.' }); return true; }
      if (!safeEqual(req.headers['x-csrf-token'] || '', session.csrf)) { reply(res, 403, { error: 'Actualiza la página e inténtalo de nuevo.' }); return true; }
      if (pathname.endsWith('/logout')) {
        sessions.delete(session.key); res.setHeader('Set-Cookie', cookie('', 0)); reply(res, 200, { loggedOut: true }); return true;
      }
    }
    if (!['/api/auth/setup', '/api/auth/login', '/api/auth/password'].includes(pathname)) { reply(res, 404, { error: 'Acción no disponible.' }); return true; }
    const ip = req.socket.remoteAddress, now = Date.now();
    const attempt = attempts.get(ip);
    if (attempt?.until > now && attempt.count >= 6) { res.setHeader('Retry-After', String(Math.ceil((attempt.until - now) / 1000))); reply(res, 429, { error: 'Demasiados intentos. Espera 15 minutos para volver a intentar.' }); return true; }
    if (attempts.size >= 10000 && !attempts.has(ip)) { reply(res, 429, { error: 'Espera unos minutos e inténtalo de nuevo.' }); return true; }
    attempts.set(ip, attempt?.until > now ? { ...attempt, count: attempt.count + 1 } : { count: 1, until: now + 15 * 60 * 1000 });
    if (busy >= 2) { reply(res, 429, { error: 'Espera un momento e inténtalo de nuevo.' }); return true; }
    if (pathname.endsWith('/setup') && (!localSetup(req) || settingUp)) { reply(res, 403, { error: 'La creación inicial no está disponible.' }); return true; }
    const input = await body(req, 3000);
    if (!input || typeof input.password !== 'string' || input.password.length > 128 || (pathname.endsWith('/password') && (typeof input.currentPassword !== 'string' || input.currentPassword.length > 128))) { reply(res, 400, { error: 'Revisa los datos de acceso.' }); return true; }
    busy++;
    let ownsSetup = false;
    try {
      if (pathname.endsWith('/setup')) {
        if (typeof input.username !== 'string' || !/^[\w.@-]{3,64}$/.test(input.username) || input.password.length < 12) { reply(res, 400, { error: 'Usa un usuario de 3 a 64 caracteres y una contraseña de al menos 12 caracteres.' }); return true; }
        if (settingUp || account) { reply(res, 409, { error: 'La cuenta ya está configurada.' }); return true; }
        settingUp = ownsSetup = true;
        const next = { username: input.username, ...await passwordHash(input.password) };
        await atomicJSON('admin-auth.json', next);
        account = next;
      } else {
        const candidate = pathname.endsWith('/password') ? input.currentPassword : input.password;
        const calculated = await scrypt(candidate, account?.salt || '00000000000000000000000000000000', 64, passwordOptions);
        if (!account || !safeEqual(calculated.toString('hex'), account.hash) || (pathname.endsWith('/login') && input.username !== account.username)) { reply(res, 401, { error: 'Usuario o contraseña incorrectos.' }); return true; }
        if (pathname.endsWith('/password')) {
          if (input.password.length < 12) { reply(res, 400, { error: 'La nueva contraseña debe tener al menos 12 caracteres.' }); return true; }
          const next = { username: account.username, ...await passwordHash(input.password) };
          await atomicJSON('admin-auth.json', next);
          account = next;
          sessions.clear();
        }
      }
      attempts.delete(ip);
      if (session) sessions.delete(session.key);
      reply(res, 200, issue(res));
    } finally { busy--; if (ownsSetup) settingUp = false; }
    return true;
  }
  return { get, handle, validCsrf: (req, session) => Boolean(session && safeEqual(req.headers['x-csrf-token'] || '', session.csrf)) };
}
