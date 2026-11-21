# Book Activity

The frontend and future backend have separate folders:

```text
Book-Activity/
  frontend/    React + Vite app, books, assets, tests and tools
  backend/     Express + PostgreSQL; frontend connectivity comes later
  start.bat    Windows launcher for the frontend
```

## Run the frontend

From the repository root, run `npm run dev` (or `npm.cmd run dev` in PowerShell). This checks/starts local PostgreSQL, starts Express, waits for its database health check, and then launches the frontend. Keep that terminal open. You can also double-click `start.bat`.

To install dependencies or run commands directly inside the frontend:

```sh
cd frontend
npm install
npm run dev
```

On Windows, double-click the root `start.bat` or use `npm.cmd` if PowerShell blocks `npm.ps1`.

From `frontend/`, run `npm run build` for a production build, `npm run check` for asset checks after building, and `npm test` for the existing tests. Build output is `frontend/dist/`.

See [frontend/README.md](frontend/README.md) for frontend details.

Build with `npm --prefix frontend run build`, then serve the app through Express at `/Book-Activity/`. The backend protects raw book/media files. Static-only GitHub Pages hosting cannot enforce this login system. The existing public URL base is unchanged.

See [backend/README.md](backend/README.md) to start the local PostgreSQL database, run migrations and launch Express. `/api/health` checks the server; `/api/health/db` checks its database connection. Login, logout, School Register account management and profile updates are connected to PostgreSQL.

To view the database in a desktop window, double-click `open-pgadmin.bat`. It opens pgAdmin with the **Book Activity - Local** connection configured.

## Administrator access

Run `npm --prefix backend run admin:create` once on a new installation. Generated credentials are saved in `backend/.local/admin-account.txt` and are not tracked by Git. Use My Profile to change the initial password. School Register creates the reader accounts; public signup is disabled. Previous demo credentials no longer work.

For daily use, run `npm run dev` from the repository root, or double-click `start.bat`. It starts all required services together. `npm run dev:frontend` and `npm run dev:backend` remain available for advanced separate startup. Ctrl+C stops the app services launched by that command and leaves PostgreSQL data intact. Production uses the Express server and its compiled frontend at `/Book-Activity/`.

## Ubuntu deployment pipeline

See [deploy/README.md](deploy/README.md) for Docker, PostgreSQL persistence, HTTPS, GitHub CI, manually approved releases, office runner setup, backups and rollback. No workflow merges or pushes to main; live deployment is manual and disabled until the office VM is configured.
