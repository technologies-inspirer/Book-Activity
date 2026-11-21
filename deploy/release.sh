#!/usr/bin/env bash
set -euo pipefail
image="${1:?Pass the immutable image tag or digest}"
deploy_dir="${DEPLOY_DIR:-/srv/book-activity}"
[[ "$image" =~ ^ghcr\.io/[a-z0-9._/-]+(:[a-f0-9]{40}|@sha256:[a-f0-9]{64})$ ]] || { echo 'Use a commit SHA tag or image digest.' >&2; exit 1; }
[[ -f "$deploy_dir/.env" ]] || { echo "Configure $deploy_dir/.env first." >&2; exit 1; }
mkdir -p "$deploy_dir/backups" "$deploy_dir/videos"
chmod 700 "$deploy_dir/backups"
# Read the previous release before replacing deployment configuration.
previous="$(cat "$deploy_dir/current-image" 2>/dev/null || true)"
cp deploy/compose.yaml deploy/Caddyfile deploy/postgres-init.sh "$deploy_dir/"
cd "$deploy_dir"
export APP_IMAGE="$image"
docker compose config --quiet
docker compose pull
# Keep a full database backup before migrations; never delete volumes during updates.
docker compose up -d --wait db
backup="backups/pre-release-$(date -u +%Y%m%dT%H%M%SZ).dump"
umask 077
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$backup"
# Recreate the one-shot migration for EVERY release, even when the last job exited 0.
docker compose run --rm --no-deps migrate
# The completed migration above is authoritative; do not run it twice through depends_on.
if ! docker compose up -d --no-deps --wait app; then
  echo "Application health check failed. Database backup: $deploy_dir/$backup" >&2
  echo 'Review logs and migration compatibility before following the rollback instructions.' >&2
  exit 1
fi
docker compose up -d --no-deps proxy
docker compose exec -T proxy caddy reload --config /etc/caddy/Caddyfile
[[ -z "$previous" ]] || printf '%s\n' "$previous" > previous-image
printf '%s\n' "$image" > current-image
# Future manual Compose invocations must use the same deployed image.
if grep -q '^APP_IMAGE=' .env; then
  sed -i "s|^APP_IMAGE=.*|APP_IMAGE=$image|" .env
else
  printf '\nAPP_IMAGE=%s\n' "$image" >> .env
fi
echo "Deployed $image; database backup: $backup"
