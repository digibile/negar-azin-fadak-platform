#!/usr/bin/env bash
set -euo pipefail
umask 077
if [[ -e .env ]]; then echo "Refusing to overwrite existing .env" >&2; exit 1; fi
command -v openssl >/dev/null || { echo "openssl is required" >&2; exit 1; }
db_pass="$(openssl rand -hex 32)"
jwt_secret="$(openssl rand -hex 48)"
otp_pepper="$(openssl rand -hex 32)"
captcha_pepper="$(openssl rand -hex 32)"
db_pass_url="$(node -e 'process.stdout.write(encodeURIComponent(process.argv[1]))' "$db_pass")"
cat > .env <<EOF
POSTGRES_DB=digibail_prod
POSTGRES_USER=digibail_app
POSTGRES_PASSWORD=$db_pass
DATABASE_URL=postgresql://digibail_app:$db_pass_url@db:5432/digibail_prod
PORT=1631
HOST=0.0.0.0
JWT_SECRET=$jwt_secret
OTP_PEPPER=$otp_pepper
CAPTCHA_PEPPER=$captcha_pepper
BRAND_NAME=دیجی‌بایل پی
KAVENEGAR_API_KEY=
KAVENEGAR_TEMPLATE=
EOF
chmod 600 .env
echo "Created .env with unique secrets and mode 600."
echo "Configure KAVENEGAR_API_KEY and KAVENEGAR_TEMPLATE before enabling real OTP."
