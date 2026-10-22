import http from 'node:http';
const origin = new URL(process.env.APP_ORIGIN || `http://localhost:${process.env.PORT || 3000}`);
await new Promise(resolve => {
  const request = http.get({ hostname: '127.0.0.1', port: process.env.PORT || 3000, path: '/api/content', headers: { Host: origin.host }, timeout: 4000 }, response => {
    let raw = '';
    response.on('data', bytes => { raw += bytes; });
    response.on('end', () => {
      try { if (response.statusCode !== 200 || !Array.isArray(JSON.parse(raw).modules)) process.exitCode = 1; } catch { process.exitCode = 1; }
      resolve();
    });
    response.on('error', () => { process.exitCode = 1; resolve(); });
  });
  request.on('timeout', () => request.destroy(new Error('Healthcheck timeout')));
  request.on('error', () => { process.exitCode = 1; resolve(); });
});
