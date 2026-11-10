#!/usr/bin/env bash
# host-update.sh — pull + build an Apertium repo on the translation host, using
# the same /opt/apertium/{pull,build}-repo.sh the site's Dictionaries dialog runs
# (build-repo.sh also restarts APy and checks the new PID).
#
# Usage:
#   ./scripts/host-update.sh ido|epo|bilingual|all
#
# HOST_SSH is how to get a shell on the host; the default is the current GCP VM
# (see infra/host/README.md). For another host, e.g.:
#   HOST_SSH="ssh ubuntu@my-host" ./scripts/host-update.sh ido
set -euo pipefail

HOST_SSH="${HOST_SSH:-gcloud --project daatan compute ssh ido-translator --zone us-central1-a --quiet --command}"
REPO="${1:-}"
case "$REPO" in
  ido|epo|bilingual) REPOS="$REPO" ;;
  all) REPOS="ido epo bilingual" ;;
  *) echo "Usage: $0 <ido|epo|bilingual|all>"; exit 1 ;;
esac

for r in $REPOS; do
  echo "==> [$r] pull + build (slow on the 1 GB host: a few minutes per repo)"
  $HOST_SSH "sudo -u apertium /opt/apertium/pull-repo.sh $r && sudo -u apertium /opt/apertium/build-repo.sh $r"
done

echo "==> Smoke test"
$HOST_SSH "curl -fsS 'http://127.0.0.1:2737/translate?langpair=ido%7Cepo&q=La+hundo+manjas.'; echo; curl -fsS 'http://127.0.0.1:2737/translate?langpair=epo%7Cido&q=La+hundo+man%C4%9Das.'; echo"
