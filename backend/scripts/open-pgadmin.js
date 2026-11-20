import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const local = join(root, '.local');
const executable = join(local, 'pgsql', 'pgAdmin 4', 'runtime', 'pgAdmin4.exe');
if (!existsSync(executable)) throw new Error('pgAdmin is not installed in backend/.local/pgsql/pgAdmin 4.');
if (!existsSync(join(local, 'pgadmin-data', 'connection-registered'))) throw new Error('Run node scripts/setup-pgadmin.js from backend first.');
const status = spawnSync(join(local, 'pgsql', 'bin', 'pg_ctl.exe'), ['-D', join(local, 'pgdata'), 'status'], { windowsHide: true, stdio: 'ignore' });
if (status.status !== 0) {
  const start = spawnSync(process.execPath, [join(root, 'scripts', 'local-postgres.js'), 'start'], { windowsHide: true, stdio: 'inherit' });
  if (start.status !== 0) process.exit(start.status || 1);
}
const environment = { ...process.env };
delete environment.ELECTRON_RUN_AS_NODE;
const child = spawn(executable, [], { cwd: join(local, 'pgsql', 'pgAdmin 4', 'runtime'), detached: true, stdio: 'ignore', windowsHide: false, env: environment });
child.on('error', error => { console.error(`Could not open pgAdmin: ${error.message}`); process.exitCode = 1; });
child.unref();
console.log('Opening pgAdmin. Expand Book Activity > Book Activity - Local > Databases > book_activity.');
