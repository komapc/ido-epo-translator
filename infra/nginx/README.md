# Nginx on the translation server

The Cloudflare worker reaches the server only through `https://apy.lipu.dev`.

| File | Server path | Purpose |
|------|-------------|---------|
| `apy-lipu-dev.conf` | `/etc/nginx/sites-available/apy-lipu-dev` | TLS on 443: webhook routes to port 8081, everything else to APy on 2737. On port 80: certificate challenge and redirect. |
| `default-drop.conf` | `/etc/nginx/sites-available/default-drop` | Drops every other request on port 80. |

Ports 2737 and 8081 are closed in the cloud firewall and in `ufw`, so nginx is the only way in.

## Changing the config

Copy the file to the server path, then run:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## Certificate

Issued by certbot (apt package) with the webroot `/var/www/certbot`, and renewed by `certbot.timer`. On a new host, `infra/host/issue-cert.sh` issues it once DNS points there. A deploy hook reloads nginx. To check renewal:

```bash
sudo certbot renew --dry-run --no-random-sleep-on-renew
```

Without `--no-random-sleep-on-renew` the command can wait for several minutes before doing anything.

Until the certificate exists, `infra/host/provision.sh` installs `apy-lipu-dev.bootstrap.conf` (same routes on plain HTTP). Access to the host: see `RUNBOOK.md`.
