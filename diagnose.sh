#!/bin/bash
# Diagnose the current state

SSH_KEY="$HOME/.ssh/apertium.pem"
EC2_HOST="ubuntu@ec2-52-211-137-158.eu-west-1.compute.amazonaws.com"

echo "=== Diagnostic Report ==="
echo ""

ssh -i "$SSH_KEY" "$EC2_HOST" << 'ENDSSH'
echo "1. Container Status:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

echo "2. Container Directory Structure:"
docker exec ido-epo-apy ls -la /opt/apertium/ 2>&1 || echo "ERROR: Directory not accessible"
echo ""

echo "3. Scripts in Container:"
docker exec ido-epo-apy ls -lh /opt/apertium/*.sh 2>&1 || echo "ERROR: Scripts not found"
echo ""

echo "4. Webhook Server Status:"
sudo systemctl status webhook-server --no-pager | head -20
echo ""

echo "5. Webhook Server Listening:"
sudo netstat -tlnp | grep 9100 || echo "ERROR: Not listening on port 9100"
echo ""

echo "6. Test Webhook Endpoint:"
curl -X POST http://localhost:9100/pull-repo \
  -H "Content-Type: application/json" \
  -d '{"repo": "ido"}' 2>&1 || echo "ERROR: Webhook not responding"
echo ""

echo "7. Webhook Server Logs (last 20 lines):"
sudo journalctl -u webhook-server -n 20 --no-pager
echo ""

echo "8. Recent Webhook Errors:"
sudo journalctl -u webhook-server --since "5 minutes ago" --no-pager | grep -i error || echo "No recent errors"
ENDSSH

echo ""
echo "=== End Diagnostic Report ==="
