#!/usr/bin/env bash
# DocTrim API deployment for an Ubuntu/Debian VPS with Caddy already installed.
# Usage:  sudo bash deploy.sh api.yourdomain.com
# If no domain is given, a sslip.io name based on the public IP is used (auto TLS).
set -euo pipefail

DOMAIN="${1:-}"
APP_DIR=/opt/doctrim
PORT=8090

if [[ -z "$DOMAIN" ]]; then
  IP="$(curl -s https://api.ipify.org || hostname -I | awk '{print $1}')"
  DOMAIN="$(echo "$IP" | tr '.' '-').sslip.io"
  echo "No domain supplied; using $DOMAIN"
fi

echo "==> Installing system dependencies"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y python3-venv python3-pip ghostscript libreoffice \
  tesseract-ocr tesseract-ocr-eng ocrmypdf curl

echo "==> Setting up app at $APP_DIR"
mkdir -p "$APP_DIR"
cp "$(dirname "$0")/main.py" "$APP_DIR/main.py"
cp "$(dirname "$0")/requirements.txt" "$APP_DIR/requirements.txt"
python3 -m venv "$APP_DIR/venv"
"$APP_DIR/venv/bin/pip" install --upgrade pip
"$APP_DIR/venv/bin/pip" install -r "$APP_DIR/requirements.txt"

echo "==> Installing systemd service"
cat > /etc/systemd/system/doctrim-api.service <<EOF
[Unit]
Description=DocTrim API
After=network.target

[Service]
WorkingDirectory=$APP_DIR
Environment=DOCTRIM_ORIGINS=https://doctrim.pages.dev,https://$DOMAIN
ExecStart=$APP_DIR/venv/bin/uvicorn main:app --host 127.0.0.1 --port $PORT
Restart=always
RestartSec=3
User=root

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now doctrim-api
systemctl restart doctrim-api

echo "==> Configuring Caddy for $DOMAIN"
CADDYFILE=/etc/caddy/Caddyfile
if ! grep -q "$DOMAIN" "$CADDYFILE" 2>/dev/null; then
  cat >> "$CADDYFILE" <<EOF

$DOMAIN {
    reverse_proxy 127.0.0.1:$PORT
}
EOF
fi
systemctl reload caddy || systemctl restart caddy

echo "==> Done. Health check:"
sleep 2
curl -s "https://$DOMAIN/api/health" || curl -s "http://127.0.0.1:$PORT/api/health"
echo
echo "API base URL: https://$DOMAIN"
