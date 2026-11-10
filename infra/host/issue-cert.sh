#!/usr/bin/env bash
# issue-cert.sh — run on the NEW host only after apy.lipu.dev's A record
# points at it. Gets a Let's Encrypt cert via webroot (nginx keeps serving),
# then swaps the bootstrap HTTP config for the TLS one.
set -euo pipefail
[ "$(id -u)" -eq 0 ] || { echo "run as root (sudo)"; exit 1; }
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
FQDN="${HOSTNAME_FQDN:-apy.lipu.dev}"

me=$(curl -fsS https://api.ipify.org)
dns=$(getent ahostsv4 "$FQDN" | awk 'NR==1{print $1}')
if [ "$me" != "$dns" ]; then
  echo "$FQDN resolves to $dns, this host is $me — switch DNS first (or wait for TTL)."
  exit 1
fi

certbot certonly --webroot -w /var/www/certbot -d "$FQDN" \
  --non-interactive --agree-tos --register-unsafely-without-email \
  --deploy-hook "systemctl reload nginx"
install -m 644 "$REPO_ROOT/infra/nginx/apy-lipu-dev.conf" /etc/nginx/sites-available/apy-lipu-dev
nginx -t && systemctl reload nginx
systemctl list-timers certbot.timer --no-pager
# Test via loopback: right after a reload, and on clouds without hairpin NAT,
# connecting to our own public IP can fail even though outside clients work.
sleep 2
curl -fsS --resolve "$FQDN:443:127.0.0.1" "https://$FQDN/listPairs" && echo && echo "OK: TLS serving"
