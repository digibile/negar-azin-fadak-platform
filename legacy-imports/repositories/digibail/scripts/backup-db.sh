#!/usr/bin/env bash
set -euo pipefail
if [[ -f .env ]]; then set -a; source .env; set +a; fi
: "${POSTGRES_DB:?Set POSTGRES_DB}"
: "${POSTGRES_USER:?Set POSTGRES_USER}"
: "${POSTGRES_PASSWORD:?Set POSTGRES_PASSWORD}"
out="${1:-./backups}"
mkdir -p "$out"
chmod 700 "$out"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
file="$out/${POSTGRES_DB}_${stamp}.sql.gz"
docker compose exec -T -e PGPASSWORD="$POSTGRES_PASSWORD" db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-privileges | gzip -9 > "$file"
chmod 600 "$file"
echo "Backup created: $file"
