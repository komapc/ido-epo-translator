#!/usr/bin/env bash
# provision.sh — turn a fresh Ubuntu 24.04 host (any cloud, any VM) into the
# apy.lipu.dev translation server. Idempotent: safe to re-run.
#
# Usage (as root, from a checkout of this repo on the host):
#   sudo infra/host/provision.sh
#
# What it does NOT do (deliberately, see infra/host/README.md):
#   - create the VM            -> infra/host/<cloud>/create-vm.sh
#   - put the webhook secret   -> /etc/ido-translator/secrets.env (by hand)
#   - issue the TLS cert       -> infra/host/issue-cert.sh, after DNS points here
set -euo pipefail

[ "$(id -u)" -eq 0 ] || { echo "run as root (sudo)"; exit 1; }
. /etc/os-release
[ "${VERSION_ID:-}" = "24.04" ] || echo "WARNING: tested on Ubuntu 24.04 only (this is ${PRETTY_NAME:-unknown})"

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SVC_USER="${SVC_USER:-apertium}"
SWAP_GB="${SWAP_GB:-2}"
APY_COMMIT="${APY_COMMIT:-6273db69125deb6926910e556b751ba592f67e99}"
HOSTNAME_FQDN="${HOSTNAME_FQDN:-apy.lipu.dev}"

log() { echo; echo "=== $* ==="; }

log "swap (${SWAP_GB}G) — dictionary builds OOM a 1 GB box without it"
if [ -z "$(swapon --show --noheadings)" ]; then
  fallocate -l "${SWAP_GB}G" /swapfile
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
swapon --show

log "apt: base packages + Apertium nightly repo"
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get install -y -q curl ca-certificates git build-essential autoconf automake \
  libtool pkg-config python3 python3-venv nodejs nginx certbot ufw
if ! grep -rqs projectjj /etc/apt/sources.list.d/; then
  curl -fsSL https://apertium.projectjj.com/apt/install-nightly.sh | bash
fi
apt-get install -y -q apertium-all-dev apertium-anaphora apertium-separable \
  apertium-recursive apertium-get apertium-regtest apertium-eval-translator

log "service user ${SVC_USER}"
id "$SVC_USER" >/dev/null 2>&1 || useradd --system --create-home --shell /bin/bash "$SVC_USER"
# The build scripts run `sudo make install`, `sudo ldconfig`, `sudo cp` (t1x
# sources) and `sudo systemctl restart apy-server`. make install is root-
# equivalent anyway; the list just keeps the intent visible.
cat > /etc/sudoers.d/ido-translator <<EOF
$SVC_USER ALL=(root) NOPASSWD: /usr/bin/make install, /usr/sbin/ldconfig, /sbin/ldconfig, /usr/bin/cp, /usr/bin/systemctl restart apy-server
EOF
chmod 440 /etc/sudoers.d/ido-translator
visudo -cf /etc/sudoers.d/ido-translator

log "language repos -> /opt/apertium"
install -d -o "$SVC_USER" -g "$SVC_USER" /opt/apertium
clone() { # url branch dir
  if [ ! -d "$3/.git" ]; then sudo -u "$SVC_USER" git clone -q -b "$2" "$1" "$3"; fi
}
clone https://github.com/komapc/apertium-ido.git     main   /opt/apertium/apertium-ido
clone https://github.com/apertium/apertium-epo.git    master /opt/apertium/apertium-epo
clone https://github.com/komapc/apertium-ido-epo.git  main   /opt/apertium/apertium-ido-epo

log "maintenance scripts -> /opt/apertium"
install -o "$SVC_USER" -g "$SVC_USER" -m 755 "$REPO_ROOT/apy-server/rebuild-self-updating.sh" /opt/apertium/rebuild.sh
install -o "$SVC_USER" -g "$SVC_USER" -m 755 "$REPO_ROOT/apy-server/build-repo.sh" /opt/apertium/build-repo.sh
install -o "$SVC_USER" -g "$SVC_USER" -m 755 "$REPO_ROOT/apy-server/pull-repo.sh"  /opt/apertium/pull-repo.sh
install -o root -g root -m 644 "$REPO_ROOT/webhook-server-no-docker.js" /opt/webhook-server.js
install -o "$SVC_USER" -g "$SVC_USER" -m 644 /dev/null /var/log/apertium-rebuild.log 2>/dev/null || true
chown "$SVC_USER:$SVC_USER" /var/log/apertium-rebuild.log

log "APy @ ${APY_COMMIT:0:8} -> /opt/apertium-apy (venv, pinned deps)"
if [ ! -d /opt/apertium-apy/.git ]; then
  git clone -q https://github.com/apertium/apertium-apy.git /opt/apertium-apy
fi
git -C /opt/apertium-apy fetch -q origin
git -C /opt/apertium-apy checkout -q "$APY_COMMIT"
[ -x /opt/apertium-apy/.venv/bin/python ] || python3 -m venv /opt/apertium-apy/.venv
/opt/apertium-apy/.venv/bin/pip install -q -r "$REPO_ROOT/infra/host/apy-requirements.txt"

log "systemd units"
install -d -m 750 /etc/ido-translator
if [ ! -f /etc/ido-translator/secrets.env ]; then
  # Never in git. The webhook refuses to start until this is filled in;
  # translation (APy) works regardless. See README "Secret".
  printf 'REBUILD_SHARED_SECRET=\n' > /etc/ido-translator/secrets.env
  chmod 600 /etc/ido-translator/secrets.env
fi
for unit in apy-server webhook-server; do
  sed "s/@SVC_USER@/$SVC_USER/g" "$REPO_ROOT/infra/host/systemd/$unit.service" > "/etc/systemd/system/$unit.service"
done
systemctl daemon-reload
systemctl enable apy-server webhook-server >/dev/null

log "build + install dictionaries (slow on a 1 GB box: ~10-30 min first time)"
if [ ! -f /usr/local/share/apertium/modes/ido-epo.mode ] || [ "${REBUILD:-0}" = 1 ]; then
  # rebuild.sh self-updates from GitHub main, then pulls, builds, installs and
  # restarts apy-server — the same path the /rebuild webhook takes in prod.
  systemctl start apy-server || true
  sudo -u "$SVC_USER" /opt/apertium/rebuild.sh
else
  echo "dictionaries already installed (REBUILD=1 to force)"
fi
systemctl restart apy-server
if grep -q '^REBUILD_SHARED_SECRET=.\+' /etc/ido-translator/secrets.env; then
  systemctl restart webhook-server
else
  echo "webhook-server NOT started: /etc/ido-translator/secrets.env has no secret yet"
fi

log "nginx"
install -d /var/www/certbot
install -m 644 "$REPO_ROOT/infra/nginx/default-drop.conf" /etc/nginx/sites-available/default-drop
ln -sf /etc/nginx/sites-available/default-drop /etc/nginx/sites-enabled/default-drop
rm -f /etc/nginx/sites-enabled/default
if [ -f "/etc/letsencrypt/live/$HOSTNAME_FQDN/fullchain.pem" ]; then
  install -m 644 "$REPO_ROOT/infra/nginx/apy-lipu-dev.conf" /etc/nginx/sites-available/apy-lipu-dev
else
  # No cert yet (DNS still points at the old host): serve the same routes on
  # plain HTTP so the box can be tested with `curl --resolve`. issue-cert.sh
  # swaps in the TLS config.
  install -m 644 "$REPO_ROOT/infra/nginx/apy-lipu-dev.bootstrap.conf" /etc/nginx/sites-available/apy-lipu-dev
fi
ln -sf /etc/nginx/sites-available/apy-lipu-dev /etc/nginx/sites-enabled/apy-lipu-dev
nginx -t
systemctl reload nginx || systemctl restart nginx

log "host firewall (ufw): 22, 80, 443 only"
ufw allow 22/tcp >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
ufw --force enable >/dev/null
ufw status

log "smoke test"
sleep 3
out=$(curl -fsS 'http://127.0.0.1:2737/translate?langpair=ido|epo&q=la+hundo+esas+bona' || true)
echo "$out"
echo "$out" | grep -q '"responseStatus": *200' && echo "OK: APy translates" || { echo "FAIL: APy smoke test"; exit 1; }
