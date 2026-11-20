import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { parseEnv } from 'node:util';
import { spawn, spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const backend = join(root, 'backend');
const frontend = join(root, 'frontend');
const children = new Set();
let stopping = false;

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (process.platform === 'win32') spawnSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
    else child.kill('SIGTERM');
  }
  process.exit(code);
}
process.once('SIGINT', () => stop());
process.once('SIGTERM', () => stop());

function launch(args, cwd, env = process.env) {
  const child = spawn(process.execPath, args, { cwd, env, stdio: 'inherit', windowsHide: true });
  children.add(child);
  child.once('error', error => { console.error(`Could not start a development service: ${error.message}`); stop(1); });
  child.once('exit', code => {
    children.delete(child);
    if (!stopping) { console.error('A development service stopped. Restart with npm run dev.'); stop(code || 1); }
  });
  return child;
}
const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
async function health(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1500) });
    return response.ok ? await response.json() : null;
  } catch { return null; }
}

try {
  const envPath = join(backend, '.env');
  if (!existsSync(envPath)) throw new Error('Backend configuration is missing. Complete the database setup in backend/README.md first.');
  const config = parseEnv(readFileSync(envPath, 'utf8'));
  const databaseUrl = process.env.DATABASE_URL || config.DATABASE_URL;
  const port = Number(process.env.PORT || config.PORT || 3001);
  if (!databaseUrl || !Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Check DATABASE_URL and PORT in backend/.env.');
  const require = createRequire(join(backend, 'package.json'));
  const { Client } = require('pg');
  async function databaseReady() {
    const client = new Client({ connectionString: databaseUrl, connectionTimeoutMillis: 2000 });
    try { await client.connect(); await client.query('SELECT 1'); return true; }
    catch { return false; }
    finally { await client.end().catch(() => {}); }
  }
  if (!await databaseReady()) {
    console.log('Starting local PostgreSQL...');
    const result = spawnSync(process.execPath, [join(backend, 'scripts/local-postgres.js'), 'start'], { cwd: backend, stdio: 'inherit', windowsHide: true, timeout: 70000 });
    if (result.status !== 0 || !await databaseReady()) throw new Error('PostgreSQL could not start. Check backend/.local/postgres.log and backend/.env.');
  }
  console.log('PostgreSQL ready.');

  const backendUrl = `http://127.0.0.1:${port}`;
  const running = await health(`${backendUrl}/api/health`);
  if (running?.service === 'book-activity-backend') console.log('Using the running backend.');
  else {
    console.log('Starting Express backend...');
    launch(['--watch', 'src/server.js'], backend);
  }
  let ready = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    if ((await health(`${backendUrl}/api/health/db`))?.database === 'connected') { ready = true; break; }
    await wait(500);
  }
  if (!ready) throw new Error('Backend did not become ready. Check the server error above.');
  console.log('Backend and database connection ready.');

  let existingFrontend = false;
  try {
    const response = await fetch('http://127.0.0.1:5173/Book-Activity/', { signal: AbortSignal.timeout(1500) });
    const html = await response.text();
    existingFrontend = response.ok && html.includes('/src/main.jsx') && html.includes('Javed Publishers');
  } catch { /* Start Vite if no project frontend is listening. */ }
  if (existingFrontend) console.log('Using the running frontend.');
  else {
    const vite = join(frontend, 'node_modules/vite/bin/vite.js');
    if (!existsSync(vite)) throw new Error('Frontend dependencies are missing. Run npm --prefix frontend install.');
    launch([vite, '--host', '127.0.0.1', '--port', '5173', '--strictPort', ...process.argv.slice(2)], frontend, { ...process.env, BACKEND_PORT: String(port) });
  }
  console.log('\nBook Activity: http://localhost:5173/Book-Activity/');
  console.log('Keep this terminal open. Ctrl+C stops the app services started here; database data is preserved.');
} catch (error) {
  console.error(`Startup failed: ${error.message}`);
  stop(1);
}
