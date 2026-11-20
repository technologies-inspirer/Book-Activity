import { app } from './app.js';
import { pool } from './db/pool.js';

const port = Number(process.env.PORT || 3001);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}

const server = app.listen(port, '127.0.0.1', () => {
  console.log(`Backend running at http://127.0.0.1:${port}`);
  console.log(`Health check: http://127.0.0.1:${port}/api/health`);
});

server.on('error', error => {
  console.error(`Backend failed to start: ${error.message}`);
  process.exitCode = 1;
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    server.close(async () => {
      await pool.end();
      process.exitCode = 0;
    });
  });
}
