# The translation host: rebuild it anywhere

The Cloudflare worker knows only one hostname, `apy.lipu.dev` (see `wrangler.toml`).
Whatever machine that name points at is the translation server. Moving to another
host or cloud therefore takes four steps: create a VM, provision it, switch DNS, and
issue a certificate. Nothing in this directory is tied to one cloud.

| File | What it does |
|------|--------------|
| `bootstrap.sh` | One-liner entry point on a fresh Ubuntu 24.04 host: clones this repo to `/opt/ido-epo-translator` and runs `provision.sh` |
| `provision.sh` | Idempotent setup: swap, Apertium nightly packages, the 3 language repos, APy (pinned commit + venv), the webhook, systemd units, nginx, ufw, smoke test |
| `issue-cert.sh` | After DNS points here: Let's Encrypt cert (webroot) + switch nginx to the TLS config |
| `systemd/*.service` | `apy-server` (APy on 127.0.0.1:2737) and `webhook-server` (127.0.0.1:8081), both run as the `apertium` user |
| `apy-requirements.txt` | Pinned Python deps for APy |
| `gcp/create-vm.sh` | e2-micro + static IP + 80/443 firewall rule (current home, project `daatan`, us-central1, free tier) |
| `aws/create-vm.sh` | t3.micro + Elastic IP + security group (the pre-2026-11 home, eu-west-1) |

nginx configs live in `../nginx/`. `apy-lipu-dev.bootstrap.conf` serves plain HTTP
until a certificate exists.

## Moving the server

1. **Create the VM.** Run `infra/host/gcp/create-vm.sh` or `infra/host/aws/create-vm.sh`. On any
   other provider, create Ubuntu 24.04 x86_64 with at least 1 GB RAM and 20 GB disk, open 80/443, and
   give it a static IPv4.
2. **Provision it.** On the VM run:
   ```bash
   curl -fsSL https://raw.githubusercontent.com/komapc/ido-epo-translator/main/infra/host/bootstrap.sh | sudo bash
   ```
   The first run takes 20–40 minutes on a 1 GB box, most of it compiling the dictionaries. It ends
   with a translation smoke test. Re-running it is safe. `REBUILD=1` forces the dictionaries to
   rebuild.
3. **Copy the webhook secret.** See *Secret* below. Translation works without it; only
   rebuild/pull/build need it.
4. **Test before switching DNS.** From your laptop:
   ```bash
   curl --resolve apy.lipu.dev:80:<NEW_IP> 'http://apy.lipu.dev/translate?langpair=ido|epo&q=la+hundo'
   ```
5. **Switch DNS.** In Cloudflare, zone `lipu.dev`, set the `apy` A record to `<NEW_IP>`. Keep it
   **DNS only** (grey cloud).
6. **Issue the certificate on the new host:** `sudo /opt/ido-epo-translator/infra/host/issue-cert.sh`.
   It refuses to run until DNS resolves to the host. Between steps 5 and 6, HTTPS can fail for a few
   minutes.
7. Keep the old host for about a week, then delete it together with its static IP. A static IP that
   is still allocated keeps billing.

## Secret

`REBUILD_SHARED_SECRET` must match the Cloudflare worker's secret of the same name
(`wrangler secret put REBUILD_SHARED_SECRET`). It lives only in
`/etc/ido-translator/secrets.env`:

- the line is `REBUILD_SHARED_SECRET=<value>`;
- the file is mode 600, owned by root;
- it is never in git.

To move it, copy the value from the old host's file to the new one. On the original EC2 host it is
in the systemd drop-in `/etc/systemd/system/webhook-server.service.d/secret.conf` instead. To
rotate it, generate a new value, write it on the host, and `wrangler secret put` the same value.

After any change to the file, run `sudo systemctl restart webhook-server`. `reload` keeps the old
environment.

## Day-to-day

- **Dictionary update:** the site's rebuild button, or `sudo -u apertium /opt/apertium/rebuild.sh`.
  For one repo: `/opt/apertium/build-repo.sh ido|epo|bilingual`.
- **Logs:** `journalctl -u apy-server -u webhook-server` and `/var/log/apertium-rebuild.log`.
- **Certificate renewal:** apt certbot's `certbot.timer`. The deploy hook reloads nginx. Check with
  `sudo certbot renew --dry-run`.
