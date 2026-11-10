#!/usr/bin/env bash
# bootstrap.sh — one command on a fresh Ubuntu 24.04 host:
#   curl -fsSL https://raw.githubusercontent.com/komapc/ido-epo-translator/main/infra/host/bootstrap.sh | sudo bash
# Clones this repo to /opt/ido-epo-translator (REF=<branch|tag|sha> to pin)
# and runs provision.sh from it.
set -euo pipefail
REF="${REF:-main}"
DIR=/opt/ido-epo-translator
command -v git >/dev/null || { apt-get update -q && apt-get install -y -q git; }
[ -d "$DIR/.git" ] || git clone -q https://github.com/komapc/ido-epo-translator.git "$DIR"
git -C "$DIR" fetch -q origin "$REF"
git -C "$DIR" checkout -q FETCH_HEAD
exec "$DIR/infra/host/provision.sh"
