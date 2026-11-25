#!/usr/bin/env bash
set -euo pipefail
cd "${DEPLOY_DIR:-/srv/book-activity}"
mkdir -p backups
chmod 700 backups
exec 9>backups/backup.lock
flock -n 9 || exit 0
umask 077
name="backups/daily-$(date -u +%Y%m%dT%H%M%SZ).dump"
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$name.partial"
docker compose exec -T db pg_restore --list < "$name.partial" > /dev/null
mv "$name.partial" "$name"
echo "Database backup saved: $name"
