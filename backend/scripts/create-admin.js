import { randomBytes } from 'node:crypto';
import { writeFileSync, mkdirSync } from 'node:fs';
import { pool } from '../src/db/pool.js';
import { hashPassword } from '../src/passwords.js';

try {
  const existing = await pool.query("SELECT 1 FROM users WHERE role='admin'");
  if (existing.rowCount) console.log('An administrator already exists; no credentials were changed.');
  else {
    const password = randomBytes(18).toString('base64url');
    const email = 'admin@javed.example';
    const hash = await hashPassword(password);
    const directory = new URL('../.local/', import.meta.url);
    mkdirSync(directory, { recursive: true });
    // Save credentials before insertion so a filesystem failure cannot strand the account.
    writeFileSync(new URL('admin-account.txt', directory), `Book Activity administrator\nEmail: ${email}\nPassword: ${password}\nChange this password from your profile after first login.\n`, { flag: 'wx' });
    await pool.query("INSERT INTO users (name,email,password_hash,role) VALUES ('Javed Administrator',$1,$2,'admin')", [email, hash]);
    console.log('Administrator created. Credentials: backend/.local/admin-account.txt');
  }
} finally { await pool.end(); }
