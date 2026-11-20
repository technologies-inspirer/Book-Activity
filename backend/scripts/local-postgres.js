import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const local = join(root, '.local');
const data = join(local, 'pgdata');
const bin = join(local, 'pgsql', 'bin');
const envFile = join(root, '.env');
const command = process.argv[2];
if (!['init', 'start', 'stop', 'status'].includes(command)) throw new Error('Expected init, start, stop or status.');
if (!existsSync(join(bin, 'pg_ctl.exe'))) throw new Error('Install the official PostgreSQL Windows binaries into backend/.local/pgsql first.');
mkdirSync(local, { recursive: true });

if (command === 'init' && !existsSync(envFile)) {
  const appPassword = randomBytes(32).toString('hex');
  const adminPassword = randomBytes(32).toString('hex');
  writeFileSync(envFile, `PORT=3001\nDATABASE_URL=postgresql://book_activity_app:${appPassword}@127.0.0.1:5433/book_activity\nDATABASE_ADMIN_URL=postgresql://postgres:${adminPassword}@127.0.0.1:5433/postgres\n`, { flag: 'wx' });
}
if (!existsSync(envFile)) throw new Error('Run npm run db:local:init first.');
// Read this project file directly, independently of the caller's environment.
const { parseEnv } = await import('node:util');
const config = parseEnv(readFileSync(envFile, 'utf8'));
const adminUrl = new URL(config.DATABASE_ADMIN_URL);
if (!['127.0.0.1', 'localhost'].includes(adminUrl.hostname) || adminUrl.username !== 'postgres') {
  throw new Error('Local cluster management requires a loopback postgres administrator URL.');
}
const run = (name, args) => execFileSync(join(bin, `${name}.exe`), args, { cwd: root, windowsHide: true, stdio: name === 'pg_ctl' ? 'ignore' : 'pipe', timeout: 60000 });
if (command === 'init') {
  if (!existsSync(join(data, 'PG_VERSION'))) {
    const passwordFile = join(local, 'init-password.tmp');
    try {
      writeFileSync(passwordFile, decodeURIComponent(adminUrl.password), { flag: 'wx' });
      run('initdb', ['-D', data, '-U', 'postgres', '--encoding=UTF8', '--locale=C', '--auth=scram-sha-256', `--pwfile=${passwordFile}`]);
    } finally {
      if (existsSync(passwordFile)) unlinkSync(passwordFile);
    }
  }
  console.log('Local PostgreSQL cluster initialized. Credentials are in backend/.env.');
} else {
  const args = ['-D', data];
  if (command === 'start') args.push('-l', join(local, 'postgres.log'), '-o', `-h 127.0.0.1 -p ${adminUrl.port || '5433'}`, '-w', 'start');
  else if (command === 'stop') args.push('-m', 'fast', '-w', 'stop');
  else args.push('status');
  run('pg_ctl', args);
  console.log(`Local PostgreSQL ${command} completed.`);
}
