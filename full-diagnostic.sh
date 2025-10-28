#!/bin/bash
# Complete diagnostic of the webhook system

echo "=== FULL DIAGNOSTIC ==="
echo ""

echo "1. Webhook Server Status"
echo "========================"
ssh ec2-translator "sudo systemctl status webhook-server --no-pager | head -20"

echo ""
echo "2. Last 30 Lines of Webhook Logs"
echo "================================="
ssh ec2-translator "sudo journalctl -u webhook-server -n 30 --no-pager"

echo ""
echo "3. Webhook Server File Content (last 20 lines)"
echo "==============================================="
ssh ec2-translator "sudo tail -20 /opt/webhook-server.js"

echo ""
echo "4. Check Listening Ports"
echo "========================"
ssh ec2-translator "sudo ss -tlnp | grep -E '(8081|2737|80)'"

echo ""
echo "5. Test Webhook Locally (from EC2)"
echo "==================================="
ssh ec2-translator "curl -v -X POST 'http://localhost:8081/pull-repo' \
    -H 'Content-Type: application/json' \
    -H 'X-Rebuild-Token: \$(cat ~/.webhook-secret)' \
    -d '{\"repo\": \"ido\"}' 2>&1"

echo ""
echo "6. Test Webhook from Outside"
echo "============================="
SECRET=$(ssh ec2-translator "cat ~/.webhook-secret")
echo "Using secret: ${SECRET:0:8}...${SECRET: -8}"
echo "Testing: http://ec2-52-211-137-158.eu-west-1.compute.amazonaws.com:8081/pull-repo"
curl -v -X POST "http://ec2-52-211-137-158.eu-west-1.compute.amazonaws.com:8081/pull-repo" \
    -H "Content-Type: application/json" \
    -H "X-Rebuild-Token: $SECRET" \
    -d '{"repo": "ido"}' \
    --max-time 10 2>&1

echo ""
echo "7. Check Security Group (via AWS CLI)"
echo "======================================"
INSTANCE_ID=$(ssh ec2-translator "ec2-metadata --instance-id | cut -d ' ' -f 2")
echo "Instance ID: $INSTANCE_ID"
aws ec2 describe-instances --instance-ids $INSTANCE_ID \
    --query 'Reservations[0].Instances[0].SecurityGroups[*].GroupId' \
    --output text | while read SG_ID; do
    echo ""
    echo "Security Group: $SG_ID"
    aws ec2 describe-security-groups --group-ids $SG_ID \
        --query 'SecurityGroups[0].IpPermissions[*].[FromPort,ToPort,IpProtocol]' \
        --output table
done

echo ""
echo "8. Cloudflare Worker Secrets"
echo "============================="
cd ~/apertium-dev/projects/translator
npx wrangler secret list

echo ""
echo "9. Test Port Connectivity"
echo "========================="
echo "Testing port 8081..."
timeout 5 bash -c "</dev/tcp/ec2-52-211-137-158.eu-west-1.compute.amazonaws.com/8081" && echo "✅ Port 8081 is OPEN" || echo "❌ Port 8081 is CLOSED"

echo ""
echo "=== DIAGNOSTIC COMPLETE ==="
