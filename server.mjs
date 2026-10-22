import http from 'node:http';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import crypto from 'node:crypto';
import { createAuth } from './auth.mjs';
import { seatingGuests, validateSeating } from './seating.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(root, 'data');
const uploadDir = process.env.UPLOAD_DIR ? path.resolve(process.env.UPLOAD_DIR) : path.join(root, 'assets');
const port = Number(process.env.PORT || 3000);
const production = process.env.NODE_ENV === 'production';
const appOrigin = process.env.APP_ORIGIN ? new URL(process.env.APP_ORIGIN).origin : null;
if (production && (!appOrigin || !appOrigin.startsWith('https://'))) throw new Error('Producción requiere APP_ORIGIN=https://tu-dominio.');
const origins = appOrigin ? [appOrigin] : [`http://localhost:${port}`, `http://127.0.0.1:${port}`];
const originAllowed = req => origins.includes(req.headers.origin);
const securityHeaders = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Frame-Options': 'SAMEORIGIN', 'Content-Security-Policy': "default-src 'self'; script-src 'self' https://www.youtube.com https://s.ytimg.com; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; font-src 'self'; connect-src 'self' https://www.youtube.com; frame-src 'self' https://www.youtube.com; frame-ancestors 'self'; base-uri 'self'; object-src 'none'; form-action 'self'", 'Permissions-Policy': 'camera=(), microphone=(), geolocation=()' };
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.ttf': 'font/ttf', '.woff2': 'font/woff2' };
const ids = ['hero', 'countdown', 'illustrations', 'welcome', 'celebration', 'gallery', 'details', 'rsvp'];
let writeQueue = Promise.resolve();
const readJSON = async name => JSON.parse(await readFile(path.join(dataDir, name), 'utf8'));
function exclusive(operation) {
  const result = writeQueue.then(operation);
  writeQueue = result.catch(() => {});
  return result;
}
async function atomicJSON(name, value) {
  const target = path.join(dataDir, name);
  const temp = `${target}.${crypto.randomUUID()}.tmp`;
  await writeFile(temp, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
  await rename(temp, target);
}
function validContent(content) {
  if (!content || typeof content.demo !== 'boolean' || !Array.isArray(content.modules) || content.modules.length !== ids.length) return false;
  if (new Set(content.modules.map(m => m.id)).size !== ids.length) return false;
  return content.modules.every(m => m && ids.includes(m.id) && typeof m.enabled === 'boolean' && Object.entries(m).every(([k, v]) => k === 'enabled' ? typeof v === 'boolean' : typeof v === 'string' && v.length <= 12000))
    && content.modules.find(m => m.id === 'hero').enabled && content.modules.find(m => m.id === 'rsvp').enabled
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(content.modules.find(m => m.id === 'hero').date)
    && Number.isFinite(Date.parse(content.modules.find(m => m.id === 'hero').date + ':00-05:00'))
    && content.modules[0].id === 'hero' && content.modules.at(-1).id === 'rsvp'
    && /^\d{4}-\d{2}-\d{2}$/.test(content.modules.find(m => m.id === 'rsvp').deadline)
    && Number.isFinite(Date.parse(content.modules.find(m => m.id === 'rsvp').deadline + 'T12:00:00-05:00'));
}
async function body(req, limit = 200000) {
  let raw = '';
  for await (const chunk of req) { raw += chunk; if (Buffer.byteLength(raw) > limit) throw new Error('La solicitud es demasiado grande.'); }
  try { return JSON.parse(raw); } catch { throw new Error('El formato enviado no es válido.'); }
}
function reply(res, status, value) {
  res.writeHead(status, { ...securityHeaders, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(value));
}
await mkdir(dataDir, { recursive: true });
await mkdir(uploadDir, { recursive: true });
try { await readFile(path.join(dataDir, 'rsvps.json')); } catch { await atomicJSON('rsvps.json', []); }
try { await readFile(path.join(dataDir, 'seating.json')); } catch { await atomicJSON('seating.json', { revision: 0, tables: [], assignments: [], names: {} }); }
const auth = await createAuth({ readJSON, atomicJSON: (name, value) => exclusive(() => atomicJSON(name, value)), production });
const rsvpRate = new Map();
setInterval(() => { for (const [ip, rate] of rsvpRate) if (rate.until < Date.now()) rsvpRate.delete(ip); }, 60000).unref();
const server = http.createServer(async (req, res) => {
  try {
    if (!origins.some(origin => new URL(origin).host === req.headers.host)) return reply(res, 403, { error: 'Host no permitido.' });
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    if (!['GET', 'HEAD'].includes(req.method) && !originAllowed(req)) return reply(res, 403, { error: 'Origen no permitido.' });
    if (await auth.handle(req, res, url.pathname, { body, reply, originAllowed })) return;
    const session = auth.get(req);
    const privateApi = url.pathname === '/api/seating' || url.pathname === '/api/upload' || (url.pathname === '/api/content' && req.method !== 'GET') || (url.pathname === '/api/rsvps' && req.method !== 'POST');
    if (privateApi && !session) return reply(res, 401, { error: 'Inicia sesión para continuar.' });
    if (privateApi && !['GET', 'HEAD'].includes(req.method) && !auth.validCsrf(req, session)) return reply(res, 403, { error: 'Actualiza la sesión antes de guardar.' });
    if (['/admin', '/admin/', '/admin.html'].includes(url.pathname) && !session) { res.writeHead(303, { ...securityHeaders, Location: '/admin/login', 'Cache-Control': 'no-store' }); return res.end(); }
    if (url.pathname === '/api/seating' && req.method === 'GET') {
      const seating = await readJSON('seating.json');
      return reply(res, 200, { ...seating, guests: seatingGuests(await readJSON('rsvps.json'), seating.names) });
    }
    if (url.pathname === '/api/seating' && req.method === 'PUT') {
      const input = await body(req);
      const result = await exclusive(async () => {
        const validation = validateSeating(input, await readJSON('seating.json'), await readJSON('rsvps.json'));
        if (validation.value) await atomicJSON('seating.json', validation.value);
        return validation;
      });
      return reply(res, result.value ? 200 : result.status, result.value || { error: result.error });
    }
    if (url.pathname === '/api/upload' && req.method === 'POST') {
      let size = 0; const chunks = [];
      for await (const chunk of req) { size += chunk.length; if (size > 8 * 1024 * 1024) throw new Error('La imagen debe pesar menos de 8 MB.'); chunks.push(chunk); }
      const bytes = Buffer.concat(chunks);
      const ext = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ? '.png' : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ? '.jpg' : bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP' ? '.webp' : null;
      if (!ext) return reply(res, 400, { error: 'El archivo debe ser una imagen PNG, JPG o WebP.' });
      const filename = `upload-${crypto.randomUUID()}${ext}`;
      await writeFile(path.join(uploadDir, filename), bytes, { flag: 'wx' });
      return reply(res, 201, { url: `/assets/${filename}` });
    }
    if (url.pathname === '/api/content' && req.method === 'GET') return reply(res, 200, await readJSON('content.json'));
    if (url.pathname === '/api/content' && req.method === 'PUT') {
      const content = await body(req);
      if (!validContent(content)) return reply(res, 400, { error: 'Revisa los módulos y la fecha de la boda.' });
      const original = await readJSON('content.json');
      for (const module of content.modules) {
        const schema = original.modules.find(m => m.id === module.id);
        if (Object.keys(module).sort().join() !== Object.keys(schema).sort().join()) return reply(res, 400, { error: 'Los campos del módulo no coinciden.' });
      }
      await exclusive(() => atomicJSON('content.json', content));
      return reply(res, 200, { saved: true });
    }
    if (url.pathname === '/api/rsvps' && req.method === 'GET') return reply(res, 200, await readJSON('rsvps.json'));
    if (url.pathname === '/api/rsvps' && req.method === 'POST') {
      if (!req.headers['content-type']?.startsWith('application/json')) return reply(res, 415, { error: 'Formato no permitido.' });
      const ip = req.socket.remoteAddress, rate = rsvpRate.get(ip);
      if (rate?.until > Date.now() && rate.count >= 30) return reply(res, 429, { error: 'Se han recibido muchas respuestas. Espera unos minutos.' });
      if (rsvpRate.size > 10000 && !rate) return reply(res, 429, { error: 'Inténtalo más tarde.' });
      rsvpRate.set(ip, rate?.until > Date.now() ? { ...rate, count: rate.count + 1 } : { count: 1, until: Date.now() + 15 * 60 * 1000 });
      const input = await body(req);
      if (typeof input.name !== 'string' || !input.name.trim() || input.name.length > 100 || !['yes', 'no'].includes(input.attendance) || !Number.isInteger(input.guests) || input.guests < 1 || input.guests > 8 || typeof input.message !== 'string' || input.message.length > 2000 || typeof input.diet !== 'string' || input.diet.length > 500) return reply(res, 400, { error: 'Revisa tu nombre y los datos de la respuesta.' });
      const companions = input.companions ?? [];
      const expected = input.attendance === 'yes' ? input.guests - 1 : 0;
      if (!Array.isArray(companions) || companions.length !== expected || companions.some(name => typeof name !== 'string' || !name.trim() || name.length > 100)) return reply(res, 400, { error: 'Escribe el nombre de cada acompañante para confirmar la asistencia.' });
      const record = { id: crypto.randomUUID(), name: input.name.trim(), companions: companions.map(name => name.trim()), attendance: input.attendance, diet: input.diet, message: input.message, guests: input.attendance === 'yes' ? input.guests : 0, createdAt: new Date().toISOString() };
      await exclusive(async () => {
        const records = await readJSON('rsvps.json');
        if (records.length >= 10000) throw new Error('No fue posible registrar más respuestas.');
        records.push(record);
        await atomicJSON('rsvps.json', records);
      });
      return reply(res, 201, { id: record.id });
    }
    if (url.pathname.startsWith('/api/')) return reply(res, 405, { error: 'Acción no disponible.' });
    if (!['GET', 'HEAD'].includes(req.method)) return reply(res, 405, { error: 'Acción no disponible.' });
    const pathname = decodeURIComponent(url.pathname);
    const relative = pathname === '/' ? 'index.html' : pathname === '/admin/login' ? 'assets/admin-login.html' : pathname === '/admin' || pathname === '/admin/' ? 'admin.html' : pathname.replace(/^\/+/, '');
    if (relative === 'admin.html' && !session) { res.writeHead(303, { ...securityHeaders, Location: '/admin/login', 'Cache-Control': 'no-store' }); return res.end(); }
    const allowed = ['index.html', 'admin.html', 'styles.css', 'admin.css', 'app.js', 'admin.js', 'favicon.svg'];
    if (!allowed.includes(relative) && !/^assets\/[a-zA-Z0-9_.-]+$/.test(relative)) return reply(res, 404, { error: 'Página no encontrada.' });
    const file = await readFile(relative.startsWith('assets/upload-') ? path.join(uploadDir, path.basename(relative)) : path.join(root, relative));
    res.writeHead(200, { ...securityHeaders, 'Content-Type': types[path.extname(relative)] || 'application/octet-stream', 'Cache-Control': relative === 'admin.html' || relative === 'assets/admin-login.html' ? 'no-store' : 'no-cache' });
    res.end(req.method === 'HEAD' ? undefined : file);
  } catch (error) {
    reply(res, error.code === 'ENOENT' ? 404 : 400, { error: error.code === 'ENOENT' ? 'Archivo no encontrado.' : 'No se pudo procesar la solicitud. Revisa los datos enviados.' });
  }
});
server.listen(port, process.env.HOST || '127.0.0.1', () => {
  console.log(`Invitación: http://localhost:${port}\nAdministrador: http://localhost:${port}/admin`);
});
