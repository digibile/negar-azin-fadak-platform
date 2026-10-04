#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

ENV_FILE=".env.codespaces"

if [ ! -f "$ENV_FILE" ]; then
  POSTGRES_PASSWORD="$(openssl rand -hex 24)"
  JWT_SECRET="$(openssl rand -hex 32)"
  ADMIN_PASSWORD="$(openssl rand -hex 16)"
  cat > "$ENV_FILE" <<EOF
POSTGRES_DB=negara_fadak
POSTGRES_USER=platform
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
JWT_SECRET=$JWT_SECRET
ADMIN_EMAIL=admin@localhost
ADMIN_PASSWORD=$ADMIN_PASSWORD
PUBLIC_ORIGIN=http://localhost:3000
WEB_PORT=3000
EOF
  chmod 600 "$ENV_FILE"
fi

docker compose --env-file "$ENV_FILE" -f docker-compose.production.yml -f docker-compose.codespaces.yml up -d --build
echo "Preview: http://localhost:3000"
echo "API: http://localhost:4000"
