# Nginx on the EC2 translation server

The Cloudflare worker reaches the server only through `https://apy.lipu.dev`.

| File | Server path | Purpose |
|------|-------------|---------|
| `apy-lipu-dev.conf` | `/etc/nginx/sites-available/apy-lipu-dev` | TLS on 443: webhook routes to port 8081, everything else to APy on 2737. On port 80: certificate challenge and redirect. |
| `default-drop.conf` | `/etc/nginx/sites-available/default-drop` | Drops every other request on port 80. |

Ports 2737 and 8081 are closed in the security group and in `ufw`, so nginx is the only way in.

## Changing the config

Copy the file to the server path, then run:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## Certificate

Issued by the certbot snap with the webroot `/var/www/certbot`, and renewed by `snap.certbot.renew.timer`. A deploy hook reloads nginx. To check renewal:

```bash
sudo certbot renew --dry-run --no-random-sleep-on-renew
```

Without `--no-random-sleep-on-renew` the command can wait for several minutes before doing anything.

SSH is limited to one address in the security group. If yours has changed, use SSM (instance `i-056c20a3f393e9982`).
