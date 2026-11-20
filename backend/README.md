# Backend

Express server with a PostgreSQL connection. Requires Node.js 22.13 or newer.

## Run locally

From `backend/`:

```sh
npm install
npm run dev
```

Use `npm start` to run without file watching. On PowerShell, use `npm.cmd` if `npm.ps1` is blocked.

The server listens locally at `http://127.0.0.1:3001`. Set the `PORT` environment variable to use a different port.

## Health check

`GET http://127.0.0.1:3001/api/health` returns HTTP 200:

```json
{"status":"ok","service":"book-activity-backend"}
```

Unknown routes return HTTP 404 with a JSON error.

`GET /api/health/db` checks PostgreSQL and returns HTTP 200 with `{"status":"ok","database":"connected"}`, or HTTP 503 when the database is unavailable. The basic `/api/health` route remains a server liveness check.

## Local PostgreSQL

The local Windows database uses official PostgreSQL 17 binaries in `.local/pgsql/` and persistent data in `.local/pgdata/`. It listens only on `127.0.0.1:5433`. The app database is `book_activity` and its role is `book_activity_app`, which has no superuser or role/database creation privileges.

On a new PC, obtain the Windows x64 binaries from the [official PostgreSQL Windows download page](https://www.postgresql.org/download/windows/) and extract the `pgsql` folder into `backend/.local/`. Node dependencies are installed with `npm install`.

First setup, from `backend/`:

```sh
npm run db:local:init
npm run db:start
npm run db:setup
npm run db:migrate
npm run db:check
```

Initialization generates random local administrator and application passwords in `.env` when the file does not exist. Both `.env` and `.local/` are ignored by Git. `.env.example` documents the settings; do not replace working credentials with its placeholders. `DATABASE_ADMIN_URL` is used by setup scripts, while Express uses only `DATABASE_URL`.

On subsequent runs (including after a PC restart), start the database with `npm run db:start`, then run `npm run dev`. Stop the database with `npm run db:stop`. This is a manually started local database, not an installed Windows service. Its data stays on disk between restarts.

`db:setup` creates a missing role and database without resetting existing credentials or data. `db:migrate` applies versioned SQL migrations inside a transaction, records checksums, and skips already applied migrations. Add a new migration for future schema changes.

Tables: `users` stores account details, scrypt password hashes, roles, access and expiry; `sessions` stores hashed session tokens with a 12-hour expiry. `user_progress` stores the last reading position, `portal_settings` stores organization profile details, and `login_attempts` limits repeated sign-in attempts.

## Open the database visually

Double-click `open-pgadmin.bat` in the repository root. It starts the project database if needed and opens the bundled pgAdmin desktop application. Expand **Book Activity > Book Activity - Local > Databases > book_activity > Schemas > public > Tables** to find `users` and `sessions`.

The connection uses the application's database role and a local password file inside the Git-ignored `.local/pgadmin-data/` directory. pgAdmin's settings are also stored there, independently of other pgAdmin installations. Setup follows pgAdmin's [server import workflow](https://www.pgadmin.org/docs/pgadmin4/latest/import_export_servers.html).

For a new local installation, extract `pgsql/pgAdmin 4/` from the same official binary bundle and run `node scripts/setup-pgadmin.js` from `backend/`. The launcher uses the current machine's configured connection.

## Authentication and account management

Run `npm run admin:create` once to create the first administrator. The command never resets an existing administrator. It generates a random password and saves it to the Git-ignored `.local/admin-account.txt`. The old demo login credentials do not authenticate.

Public API: `POST /api/auth/login`. Authenticated APIs include `GET /api/auth/me`, `POST /api/auth/logout`, `PATCH /api/me`, `POST /api/me/password`, and `GET/PUT /api/me/progress`. Administrator APIs are `GET/POST /api/admin/users`, `POST /api/admin/users/import`, `PATCH /api/admin/users/:id`, and `POST /api/admin/users/:id/reset-password`.

The frontend uses same-origin cookies, with Vite proxying requests to port 3001. Login returns a CSRF token; authenticated write requests must send it in `X-CSRF-Token`. Cookies are HttpOnly, SameSite=Lax, and Secure in production. Passwords use Node's asynchronous scrypt; only session token digests are stored. Password reset, account deactivation, and past expiry revoke existing access. Account roles cannot be promoted through reader APIs. Wrong credentials, disabled users and expired users get a generic login failure.

`APP_ORIGINS` is a comma-separated allowlist of exact frontend origins. Defaults cover localhost/127.0.0.1 on ports 5173 and 3001. Configure it to the actual HTTPS site origin for deployment; `.env.example` includes the setting. The server binds to loopback by default and can sit behind an HTTPS reverse proxy. Express is required for production; do not publish the build on a public static host that bypasses its media guards.

Production: build `frontend/`, then run this backend. Open `http://127.0.0.1:3001/Book-Activity/` for local verification. With `NODE_ENV=production`, use HTTPS so the Secure cookie can be sent. `/api/files/...` and `/Book-Activity/books/...`, `/videos/...`, `/sounds/...` enforce server-side login. Book/video files also enforce the user's assigned book access. Existing external YouTube links remain external resources.

`npm run test:db` runs database, authentication, access-control and frontend-store integration checks using temporary accounts that are removed afterwards. Run `npm test` from `frontend/` for the existing reader regression suite. Account and reading-position records are persisted; original drawing strokes and authoring drafts retain their existing browser-local behavior.
