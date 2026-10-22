import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export async function initialize({ dataDir, uploadDir, seedFile, authFile }) {
  await mkdir(dataDir, { recursive: true });
  await mkdir(uploadDir, { recursive: true });
  async function exists(filename) {
    try { await readFile(filename); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; }
  }
  const accountFile = path.join(dataDir, 'admin-auth.json');
  if (!(await exists(accountFile))) {
    if (!authFile) throw new Error('Monta el archivo privado de administrador usando ADMIN_AUTH_FILE. No se crea un acceso publico.');
    const account = JSON.parse(await readFile(authFile, 'utf8'));
    if (!/^[\w.@-]{3,64}$/.test(account.username || '') || !/^[a-f0-9]{32}$/.test(account.salt || '') || !/^[a-f0-9]{128}$/.test(account.hash || '')) throw new Error('El archivo privado de administrador no tiene un formato valido.');
    await writeFile(accountFile, JSON.stringify({ username: account.username, salt: account.salt, hash: account.hash }) + '\n', { flag: 'wx', mode: 0o600 });
  }
  const contentFile = path.join(dataDir, 'content.json');
  if (!(await exists(contentFile))) await writeFile(contentFile, await readFile(seedFile), { flag: 'wx', mode: 0o600 });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.env.NODE_ENV !== 'production' || !process.env.APP_ORIGIN?.startsWith('https://')) throw new Error('Configura NODE_ENV=production y APP_ORIGIN=https://tu-dominio antes de iniciar.');
  const root = fileURLToPath(new URL('../', import.meta.url));
  await initialize({
    dataDir: process.env.DATA_DIR || '/var/lib/boda/data',
    uploadDir: process.env.UPLOAD_DIR || '/var/lib/boda/uploads',
    seedFile: path.join(root, 'data', 'content.json'),
    authFile: process.env.ADMIN_AUTH_FILE
  });
  await import('../server.mjs');
}
