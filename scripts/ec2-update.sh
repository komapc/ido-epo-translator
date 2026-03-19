#!/usr/bin/env bash
# ec2-update.sh — pull + rebuild an Apertium repo on EC2, then restart APy
#
# Usage:
#   ./scripts/ec2-update.sh ido
#   ./scripts/ec2-update.sh epo
#   ./scripts/ec2-update.sh bilingual
#   ./scripts/ec2-update.sh all

set -euo pipefail

EC2_HOST="ubuntu@ec2-52-211-137-158.eu-west-1.compute.amazonaws.com"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/apertium.pem}"
SSH="ssh -i $SSH_KEY -o StrictHostKeyChecking=no -o IdentitiesOnly=yes"

REPO="${1:-}"
if [[ -z "$REPO" ]]; then
  echo "Usage: $0 <ido|epo|bilingual|all>"
  exit 1
fi

rebuild_repo() {
  local label="$1"
  case "$label" in
    ido)       DIR="/opt/apertium/apertium-ido" ;;
    epo)       DIR="/opt/apertium/apertium-epo" ;;
    bilingual) DIR="/opt/apertium/apertium-ido-epo" ;;
    *)
      echo "Unknown repo: $label (must be ido, epo, or bilingual)"
      exit 1
      ;;
  esac

  echo "==> [$label] pulling from $DIR"
  $SSH "$EC2_HOST" "
    set -e
    cd $DIR
    git pull
    sudo rm -f modes/*.mode 2>/dev/null || true
    make
    sudo make install
    sudo ldconfig
    echo '[$label] build complete'
  "
}

if [[ "$REPO" == "all" ]]; then
  rebuild_repo ido
  rebuild_repo epo
  rebuild_repo bilingual
else
  rebuild_repo "$REPO"
fi

echo "==> Restarting APy server..."
$SSH "$EC2_HOST" "sudo systemctl restart apy-server && sleep 3 && systemctl is-active apy-server"

echo "==> Testing translation endpoints..."
$SSH "$EC2_HOST" "
  echo -n 'ido→epo: '
  curl -sf 'http://localhost:2737/translate' -d 'q=La+hundo+manjas.&langpair=ido|epo' | python3 -c 'import json,sys; print(json.load(sys.stdin)[\"responseData\"][\"translatedText\"])' 2>/dev/null || echo 'FAILED'

  echo -n 'epo→ido: '
  curl -sf 'http://localhost:2737/translate' -d 'q=La+hundo+mangas.&langpair=epo|ido' | python3 -c 'import json,sys; print(json.load(sys.stdin)[\"responseData\"][\"translatedText\"])' 2>/dev/null || echo 'FAILED'
"

echo ""
echo "Done. Check https://ido-tradukilo.pages.dev/api/health to confirm."
