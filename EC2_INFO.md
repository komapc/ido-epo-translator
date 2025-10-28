# EC2 Instance Information

**Last Updated:** October 28, 2025

## Instance Details

- **Instance ID:** `i-056c20a3f393e9982`
- **Region:** `eu-west-1` (Ireland)
- **Public IP:** `52.211.137.158`
- **Public DNS:** `ec2-52-211-137-158.eu-west-1.compute.amazonaws.com`
- **SSH Key:** `apertium.pem`

## Connection

```bash
# SSH connection
ssh -i ~/.ssh/apertium.pem ubuntu@52.211.137.158

# Or using the configured alias
ssh ec2-translator
```

## Services Running

- **APy Translation Server:** Port 2737 (proxied via Nginx on port 80)
- **Nginx Reverse Proxy:** Port 80
- **Webhook Server:** Port 8081
- **Docker:** Running APy container

## URLs

- **APy Server (via Nginx):** http://ec2-52-211-137-158.eu-west-1.compute.amazonaws.com
- **APy Server (direct):** http://ec2-52-211-137-158.eu-west-1.compute.amazonaws.com:2737
- **Webhook Server:** http://ec2-52-211-137-158.eu-west-1.compute.amazonaws.com:8081

## Security Group

Required inbound ports:
- **22** (SSH) - For administration
- **80** (HTTP) - For APy server access
- **2737** (APy) - Direct APy access (optional)
- **8081** (Webhook) - For dictionary rebuild triggers

## Useful Commands

```bash
# Check webhook server status
ssh ec2-translator "sudo systemctl status webhook-server"

# View webhook logs
ssh ec2-translator "sudo journalctl -u webhook-server -f"

# Check Docker containers
ssh ec2-translator "docker ps"

# Restart webhook server
ssh ec2-translator "sudo systemctl restart webhook-server"
```

## AWS CLI Commands

```bash
# Get instance details
aws ec2 describe-instances --instance-ids i-056c20a3f393e9982

# Get security group
aws ec2 describe-instances --instance-ids i-056c20a3f393e9982 \
    --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' \
    --output text

# Open port 8081
SG_ID=$(aws ec2 describe-instances --instance-ids i-056c20a3f393e9982 \
    --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' --output text)
aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 8081 \
    --cidr 0.0.0.0/0
```
