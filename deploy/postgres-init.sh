#!/usr/bin/env bash
set -euo pipefail
psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --set=ON_ERROR_STOP=1 --set=app_password="$APP_DB_PASSWORD" --set=db="$POSTGRES_DB" <<'SQL'
CREATE ROLE book_activity_app LOGIN PASSWORD :'app_password' NOSUPERUSER NOCREATEDB NOCREATEROLE;
ALTER DATABASE :"db" OWNER TO book_activity_app;
SQL
