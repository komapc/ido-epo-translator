#!/usr/bin/env bash
# create-vm.sh — create the translation VM on Google Cloud. Idempotent-ish:
# skips anything that already exists. Then provision it with bootstrap.sh.
#
# Defaults sit inside GCP's always-free tier: one e2-micro + 30 GB
# pd-standard in us-central1/us-east1/us-west1. Only the static IPv4
# (~$3.6/mo) is billed.
set -euo pipefail
PROJECT="${PROJECT:-daatan}"
REGION="${REGION:-us-central1}"
ZONE="${ZONE:-${REGION}-a}"
NAME="${NAME:-ido-translator}"
TAG=apy-web
g() { gcloud --project "$PROJECT" "$@"; }

g compute addresses describe "$NAME-ip" --region "$REGION" >/dev/null 2>&1 ||
  g compute addresses create "$NAME-ip" --region "$REGION" --network-tier STANDARD
IP=$(g compute addresses describe "$NAME-ip" --region "$REGION" --format='value(address)')

g compute firewall-rules describe allow-apy-web >/dev/null 2>&1 ||
  g compute firewall-rules create allow-apy-web --network default \
    --allow tcp:80,tcp:443 --target-tags "$TAG" --source-ranges 0.0.0.0/0

g compute instances describe "$NAME" --zone "$ZONE" >/dev/null 2>&1 ||
  g compute instances create "$NAME" --zone "$ZONE" \
    --machine-type e2-micro \
    --image-family ubuntu-2404-lts-amd64 --image-project ubuntu-os-cloud \
    --boot-disk-size 30GB --boot-disk-type pd-standard \
    --address "$IP" --network-tier STANDARD \
    --tags "$TAG" --labels app=ido-translator,owner=komapc

echo
echo "VM $NAME up at $IP. Provision it (takes ~20-40 min, mostly the dictionary build):"
echo "  gcloud --project $PROJECT compute ssh $NAME --zone $ZONE --tunnel-through-iap -- \\"
echo "    'curl -fsSL https://raw.githubusercontent.com/komapc/ido-epo-translator/main/infra/host/bootstrap.sh | sudo bash'"
