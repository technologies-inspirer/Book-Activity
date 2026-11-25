# Ubuntu office deployment

## What is prepared

- Root Dockerfile builds React and serves it with Express in a non-root Node 22 container. Protected books/media stay behind authenticated Express routes.
- Compose runs PostgreSQL 17, a migration job, the app and Caddy HTTPS proxy. Only ports 80/443 are published. Database, account credentials and certificates have persistent named volumes.
- CI tests branch pushes and pull requests against an isolated, unprivileged PostgreSQL test account, then builds and smoke-tests the production container.
- Release is MANUAL ONLY. It accepts a full commit SHA already on main, repeats CI, builds/publishes an image to GHCR, and deploys its immutable digest through the office runner. It never merges or pushes branches.
- Office deployment stays disabled until repository variable ENABLE_OFFICE_DEPLOYMENT=true. It also uses the production GitHub environment; configure required reviewers where supported by your GitHub plan.

## One-time Ubuntu setup (later, after server access is approved)

1. Install Docker Engine and the Compose v2 plugin using https://docs.docker.com/engine/install/ubuntu/. Use an x86-64 Ubuntu VM with sufficient RAM/disk for the book library, uploaded projects and database backups. Internet access is needed for GitHub, GHCR and container images.
2. Create a dedicated deployment user. Register a GitHub self-hosted runner on the VM with labels Linux, X64, office-production. Install it as a service. Docker group access grants administrator-equivalent host access; restrict runner and repository access to trusted maintainers. PR jobs run on GitHub-hosted runners, never the office runner.
3. Create /srv/book-activity owned by that deployment user, plus videos/ and backups/. Copy deploy/.env.example to /srv/book-activity/.env; set chmod 600 on it. Set SITE_HOST to the final hostname, replace BOTH passwords with different `openssl rand -hex 32` values, and supply the approved image. Do not put VM passwords or database credentials in GitHub files.
4. For a private GHCR package, run `docker login ghcr.io` ON THE VM as the runner user, using an account/token limited to read:packages. Do not put this token into the repository. Allow this repository's Actions token access to publish its package.
5. Configure DNS and HTTPS. Caddy issues public certificates when a real domain points to this server and 80/443 are reachable. For LAN-only testing, add `tls internal` to the Caddy site block and trust Caddy's local CA on client PCs. Keep HTTPS: production sign-in uses Secure cookies. The app URL is https://YOUR_HOST/Book-Activity/; / redirects there.
6. In GitHub, create environment production and configure allowed deployment branch main and required reviewers if available. Protect main with required CI and PR review; disable force pushes. These GitHub settings cannot be enforced by repository YAML alone. No workflow automatically pushes to main.
7. Set repository Actions variable ENABLE_OFFICE_DEPLOYMENT=true only when the VM, credentials, environment and data migration are ready. Keep it unset/false until then. The pipeline must first be explicitly approved and pushed/merged before GitHub can execute it.

## Deploy an approved update

1. Make corrections on a development branch. Push/merge to main only after explicit owner permission. CI runs without deployment.
2. Copy the full 40-character SHA of the approved main commit.
3. In Actions, select Build and deploy approved release, Run workflow, select branch main, paste that SHA. A branch push by itself cannot deploy.
4. CI must pass before publishing. Approve the production environment deployment if configured. The office runner pulls the digest, backs up PostgreSQL, runs migrations, replaces the app, waits for database/app health, and starts the HTTPS proxy. A failure leaves logs and a backup for diagnosis; success records current-image and previous-image under /srv/book-activity.
5. Check https://YOUR_HOST/api/health/db, sign-in, permitted school library access, PDF upload/Save Changes and lesson playback. The proxy/container startup checks do not replace this browser acceptance check.

Updates can briefly interrupt active sessions while the single app container restarts; this is not a zero-downtime cluster. GitHub workflow concurrency serializes releases. Do not run a second manual release process at the same time.

Manual equivalent from an approved repository checkout on Ubuntu:

```bash
DEPLOY_DIR=/srv/book-activity bash deploy/release.sh ghcr.io/technologies-inspirer/book-activity@sha256:THE_APPROVED_DIGEST
```

## Initial accounts, existing data and local lesson media

A fresh server has an empty PostgreSQL volume: existing PC accounts, school permissions and uploaded books DO NOT travel through GitHub or the image. Before going live, import the existing database backup into the fresh server database if those records must be retained. Then run the migration job. Avoid creating duplicate production accounts before that import.

For a fresh installation only, after the first successful deployment:

```bash
cd /srv/book-activity
docker compose exec app node scripts/create-admin.js
docker compose exec app cat .local/admin-account.txt
```

This creates an admin only if none exists; change the generated password after sign-in. Credentials remain in the private admin_data volume. The image contains no admin password. The Windows portable PostgreSQL and local .env are excluded from Docker.

Local MP4/MOV lesson videos are ignored by Git and excluded from the image. Copy frontend/videos contents separately to /srv/book-activity/videos, preserving subdirectories, and make them readable by container UID 1000. Missing local videos cannot be recovered by the pipeline. JPEG books and tracked sounds are included in the image.

## Backups and rollback

Each release writes a PostgreSQL custom-format dump to /srv/book-activity/backups BEFORE migrations. It includes accounts, sessions, organization/catalog settings and uploaded PDF projects. Copy backups off the VM regularly and schedule daily backups for data created between releases. Keep the .env and optional videos backed up separately. Backups contain private account data; restrict access. No backup is deleted automatically; monitor disk capacity and agree a retention schedule.

Manual database backup:

```bash
cd /srv/book-activity
umask 077
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "backups/manual-$(date -u +%Y%m%dT%H%M%SZ).dump"
```

For an application-only rollback, verify that the previous image supports the migrated schema, set APP_IMAGE in .env to the digest recorded in previous-image, then run `docker compose up -d --no-deps --wait app`. Update current-image after verifying it. Do not rerun older migrations or assume database changes can be automatically reversed. A database restore can discard new records: take another backup, stop the app, and perform a separately approved restore with PostgreSQL tools before restarting. Never use `docker compose down -v` during updates or rollback.

Inspect failures with `docker compose ps -a` and `docker compose logs --tail=100 app db proxy`. A failed migration stops deployment before app replacement. Fix with a new migration; never edit an applied migration. If application health fails after replacement, review logs and schema compatibility before rollback.

POSTGRES_PASSWORD and APP_DB_PASSWORD initialize roles only on an empty database volume. Editing these values later does not rotate existing database passwords; rotate the PostgreSQL roles and environment together. Keep PostgreSQL major upgrades as a separate backup-and-migration operation.

## Verification limits

Docker is not installed on the current Windows workstation. YAML, shell syntax and application tests can be checked here; the actual image build and Compose/TLS startup must pass on a Docker-capable machine. CI contains a production-container smoke test so image problems block a manual release. No server connection, deployment, repository settings change or push to main has been performed as part of preparing these files.

## Platform references

- https://docs.docker.com/compose/how-tos/use-secrets/
- https://docs.docker.com/reference/compose-file/services/
- https://docs.github.com/en/actions/concepts/workflows-and-actions/deployment-environments
- https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/use-in-a-workflow


## Office deployment: ecosystem.javedpublishers.com

The initial office deployment was installed on 2026-11-23 from approved main commit `686a01b6d4c34673a27b112a5fd03b284c1e8012`. The image was built on Ubuntu, the existing database was restored (3 accounts and 1 uploaded book), and production gateway tests passed for login, frontend assets, book downloads and authentication/origin protections. Public DNS and the public HTTPS certificate are pending.

The deployment directory is `/srv/book-activity`. Its private `.env` contains `SITE_HOST=ecosystem.javedpublishers.com`, `COMPOSE_FILE=compose.yaml:compose.office.yaml`, and `COMPOSE_PROJECT_NAME=book-activity`, along with separately generated production database credentials. Keep this file private. The office override removes public ports from this project's Caddy gateway. Only that gateway joins the existing `attendance-prod_default` proxy network under the unique name `book-activity-gateway`; the Book Activity application/database remain on their own network. The gateway uses `Caddyfile.office` and the existing shared Caddy terminates public HTTPS.

`ecosystem.caddy` contains the new shared proxy site block. The active `/opt/attendance/Caddyfile` has that block and was validated/reloaded after saving file and active-configuration backups under `/srv/book-activity/backups`. ATS returned HTTP 200 both before and after. The pre-existing `visit.javedpublishers.com` route returned HTTP 502 before and after; its configuration was not changed.

**Pending source integration:** ATS's `attendance-cloud/scripts/sync-release.sh` replaces `/opt/attendance/Caddyfile` from its repository on a release. Its owner must add the `ecosystem.caddy` block to the ATS repository's `attendance-cloud/Caddyfile` before another ATS release. The authenticated GitHub user `zahin2002` currently has no access to that repository. Do not assume a host-only edit survives ATS releases.

Database backups run through `book-activity-backup.timer` at 02:30 Asia/Karachi every day. `backup.sh` produces a custom-format dump and verifies its archive listing before marking it complete. No retention deletion is configured. Backups are on this VM; an off-VM destination still needs to be selected and configured. The initial local database dump is retained separately. Existing local accounts/passwords were preserved, not recreated.

### GitHub owner actions still required

Update: the owner registered `book-activity-office` on 2026-11-23. Its separate service is active, connected to GitHub and listening for jobs. The `ENABLE_OFFICE_DEPLOYMENT` variable now exists and is deliberately `false`. The dedicated GHCR login and `production` environment are still pending. Runner registration steps below are retained for rebuilding the installation.

The existing repository credentials can push but return HTTP 403 when creating a runner registration token. A repository administrator must either grant the deployment operator the required access or perform these steps:

1. Open Book-Activity repository Settings > Actions > Runners > New self-hosted runner and obtain a short-lived Linux x64 registration token. Official runner binaries have been prepared separately under `/srv/book-activity/runner`; the ATS runner has not been modified.
2. As the Ubuntu `deploy` user, run `bash /srv/book-activity/register-office-runner.sh` and enter the one-time token. The script registers `book-activity-office` with label `office-production`, installs its own service and isolates Docker registry authentication with `DOCKER_CONFIG=/srv/book-activity/docker-auth`.
3. If the GHCR package is private, authenticate a read-only package account using `DOCKER_CONFIG=/srv/book-activity/docker-auth docker login ghcr.io -u YOUR_GITHUB_ACCOUNT`. Enter its package-read token interactively. Do not overwrite the default Docker credentials used by ATS.
4. Configure the repository's `production` environment and branch restrictions/reviewers, then set repository variable `ENABLE_OFFICE_DEPLOYMENT=true`. Deployment stays manual: run the release workflow against an approved full main commit SHA. No new main commit was pushed during initial server deployment.
5. Preserve the office files and the `.env` COMPOSE_FILE setting. The existing release script can then copy/update the base Compose files while this persistent office override prevents port conflicts.

### DNS handoff and acceptance

Create the public A record `ecosystem.javedpublishers.com` pointing to `157.20.146.68` (TTL 300 seconds is suitable during setup). Keep the existing TCP 80/443 forwarding to Ubuntu `10.20.10.97`; do not replace ATS DNS or publish application/database/WinRM ports. IPv6 is not configured for this site, so avoid a conflicting AAAA record.

After DNS resolves publicly, verify Caddy has obtained the public certificate, then open `https://ecosystem.javedpublishers.com/Book-Activity/`. Check `/api/health/db`, sign-in, school accounts, the uploaded book, PDF saving and QR links. Confirm ATS still responds normally. The current production gateway tests do not replace this final browser/TLS acceptance check.
