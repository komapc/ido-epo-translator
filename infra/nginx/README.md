# Nginx Configuration Management

This directory contains the nginx configuration for the EC2 translation server and deployment tools.

## Overview

The nginx configuration proxies requests to two backend services:
- **Webhook server** (port 8081): Handles `/status`, `/rebuild`, `/pull-repo`, `/build-repo`
- **APy translation server** (port 2737): Handles all other requests (translation API)

## Files

- **`apy.conf`**: Nginx configuration file
- **`deploy-nginx-config.sh`**: Deployment script with built-in tests
- **`test-nginx-config.sh`**: Standalone test script
- **`README.md`**: This documentation

## Quick Start

### Deploy Configuration

```bash
# Test configuration locally first
./test-nginx-config.sh

# Deploy with dry-run (test on EC2 without applying)
./deploy-nginx-config.sh --dry-run

# Deploy for real
./deploy-nginx-config.sh
```

### Test Only

```bash
# Run all tests
./deploy-nginx-config.sh --test
```

## Configuration Details

### Webhook Endpoints

All webhook endpoints proxy to `http://127.0.0.1:8081`:

- `/status` - Get repository status and commit information
- `/rebuild` - Trigger full dictionary rebuild
- `/pull-repo` - Pull updates for a specific repository  
- `/build-repo` - Build a specific repository

**Required headers:**
- `X-Rebuild-Token`: Authentication token (set in webhook server environment)
- `Host`: Original host header
- `X-Real-IP`: Client IP address

### Translation API

The root location (`/`) proxies to APy server at `http://127.0.0.1:2737`.

**Headers forwarded:**
- `Host`
- `X-Real-IP`
- `X-Forwarded-For`

## Deployment Script

The `deploy-nginx-config.sh` script performs the following steps:

1. **Validate local config** - Check for required location blocks
2. **Test SSH connection** - Verify EC2 connectivity
3. **Backup remote config** - Create timestamped backup in `/tmp`
4. **Upload config** - Copy to `/tmp/apy.conf` on EC2
5. **Test nginx config** - Run `nginx -t` on EC2
6. **Apply config** - Move to `/etc/nginx/sites-enabled/apy.conf`
7. **Reload nginx** - Graceful reload with `systemctl reload nginx`
8. **Verify endpoints** - Test accessibility of key endpoints

### Options

```bash
./deploy-nginx-config.sh [OPTIONS]

OPTIONS:
    --dry-run       Validate and test without applying changes
    --test          Run tests only (no deployment)
    -h, --help      Show help message
```

### Environment Variables

- `EC2_HOST`: SSH host alias (default: `ec2-translator`)

### Exit Codes

- `0`: Success
- `1`: Failure (validation, deployment, or test failure)

## Testing

The test script (`test-nginx-config.sh`) validates:

- ✓ Config file exists
- ✓ All required location blocks present
- ✓ Correct proxy_pass directives
- ✓ Required headers forwarded
- ✓ Listen directives configured
- ✓ No duplicate location blocks
- ✓ Basic syntax validation (balanced braces)

Run tests before committing changes:

```bash
./test-nginx-config.sh
```

## SSH Configuration

Ensure your SSH config includes the EC2 host alias:

```bash
# ~/.ssh/config
Host ec2-translator
    HostName 52.211.137.158
    User ubuntu
    IdentityFile ~/.ssh/apertium.pem
```

Test connectivity:

```bash
ssh ec2-translator "echo 'Connection successful'"
```

## Manual Deployment

If you need to deploy manually without the script:

```bash
# Copy config to EC2
scp apy.conf ec2-translator:/tmp/apy.conf

# SSH into EC2
ssh ec2-translator

# Test config
sudo nginx -t

# If test passes, apply
sudo mv /tmp/apy.conf /etc/nginx/sites-enabled/apy.conf
sudo systemctl reload nginx

# Verify
curl http://localhost/status
```

## Troubleshooting

### "Cannot connect to ec2-translator via SSH"

Check your SSH configuration:
```bash
ssh -v ec2-translator
```

Common fixes:
- Verify `~/.ssh/config` has correct host entry
- Check SSH key permissions: `chmod 600 ~/.ssh/apertium.pem`
- Verify EC2 instance is running

### "Nginx configuration test failed"

The script will NOT apply the config if `nginx -t` fails. Check the error output and fix the config file.

Common issues:
- Missing semicolons
- Unbalanced braces
- Invalid directives
- Incorrect proxy_pass URLs

### "Failed to reload nginx"

The config has been applied but nginx couldn't reload. SSH into EC2 to investigate:

```bash
ssh ec2-translator
sudo systemctl status nginx
sudo journalctl -u nginx -n 50
```

### Config changes not taking effect

1. Verify config was applied:
   ```bash
   ssh ec2-translator "cat /etc/nginx/sites-enabled/apy.conf | head -20"
   ```

2. Check nginx is running:
   ```bash
   ssh ec2-translator "sudo systemctl status nginx"
   ```

3. Test endpoints directly:
   ```bash
   ssh ec2-translator "curl -s http://localhost/status"
   ```

## Modifying Configuration

### Adding a new endpoint

1. Edit `apy.conf` locally
2. Add location block following existing pattern:
   ```nginx
   location /new-endpoint {
       proxy_pass http://127.0.0.1:8081/new-endpoint;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Rebuild-Token $http_x_rebuild_token;
   }
   ```
3. Run tests: `./test-nginx-config.sh`
4. Deploy with dry-run: `./deploy-nginx-config.sh --dry-run`
5. Deploy for real: `./deploy-nginx-config.sh`
6. Commit changes

### Changing backend ports

If webhook or APy server ports change, update all `proxy_pass` directives:

```nginx
# Webhook server (currently 8081)
proxy_pass http://127.0.0.1:8081/endpoint;

# APy server (currently 2737)  
proxy_pass http://127.0.0.1:2737;
```

## Security Considerations

### Authentication

Webhook endpoints require `X-Rebuild-Token` header:
- Token is set in webhook server environment: `REBUILD_SHARED_SECRET`
- Token is configured in Cloudflare Worker: `wrangler.toml`
- Token is forwarded by nginx: `proxy_set_header X-Rebuild-Token $http_x_rebuild_token`

### Network Access

- Nginx listens on port 80 (HTTP only)
- Backend services (8081, 2737) are not exposed externally
- All communication is proxied through nginx

### Rate Limiting

Consider adding rate limiting for public endpoints:

```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

location /translate {
    limit_req zone=api burst=20 nodelay;
    proxy_pass http://127.0.0.1:2737;
}
```

## Related Documentation

- [Operations Guide](../../OPERATIONS.md) - Overall deployment and operations
- [EC2 Setup](../../EC2_SETUP_NO_DOCKER.md) - EC2 server configuration
- [Webhook Setup](../../WEBHOOK_SETUP_COMPLETE.md) - Webhook server setup

## Version Control

This configuration is tracked in git. Changes go through PR review:

1. Create feature branch
2. Modify config
3. Run tests
4. Commit and push
5. Create PR
6. After approval, deploy with `./deploy-nginx-config.sh`

**Never** modify `/etc/nginx/sites-enabled/apy.conf` directly on EC2 without updating this repository.

## Backup and Recovery

### Backups

The deployment script automatically creates backups:
```bash
/tmp/apy.conf.backup.YYYYMMDD_HHMMSS
```

### Restore from backup

```bash
# List available backups
ssh ec2-translator "ls -lt /tmp/apy.conf.backup.*"

# Restore a backup
ssh ec2-translator "sudo cp /tmp/apy.conf.backup.20251122_110000 /etc/nginx/sites-enabled/apy.conf && sudo systemctl reload nginx"
```

### Restore from git

```bash
# Restore previous version
git checkout HEAD~1 -- apy.conf
./deploy-nginx-config.sh
```

## Monitoring

Check nginx access and error logs:

```bash
# Access log
ssh ec2-translator "sudo tail -f /var/log/nginx/access.log"

# Error log
ssh ec2-translator "sudo tail -f /var/log/nginx/error.log"

# Filter for webhook endpoints
ssh ec2-translator "sudo grep '/status\|/rebuild\|/pull-repo\|/build-repo' /var/log/nginx/access.log | tail -20"
```

## CI/CD Integration

The deployment script can be integrated into CI/CD pipelines:

```yaml
# GitHub Actions example
- name: Deploy nginx config
  run: |
    cd projects/translator/infra/nginx
    ./deploy-nginx-config.sh
  env:
    EC2_HOST: ec2-translator
```

**Note:** Requires SSH keys configured in CI/CD environment.

