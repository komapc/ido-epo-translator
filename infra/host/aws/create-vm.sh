#!/usr/bin/env bash
# create-vm.sh — create the translation VM on AWS EC2 (the pre-2026-11 home).
# Then provision it with bootstrap.sh (via SSM or SSH).
set -euo pipefail
REGION="${REGION:-eu-west-1}"
NAME="${NAME:-ido-translator}"
TYPE="${TYPE:-t3.micro}"
PROFILE_ARG=${INSTANCE_PROFILE:+--iam-instance-profile Name=$INSTANCE_PROFILE}  # e.g. apertium-ssm, for SSM access
a() { aws --region "$REGION" "$@"; }

AMI=$(a ssm get-parameter --name /aws/service/canonical/ubuntu/server/24.04/stable/current/amd64/hvm/ebs-gp3/ami-id --query Parameter.Value --output text)
SG=$(a ec2 describe-security-groups --filters Name=group-name,Values="$NAME-web" --query 'SecurityGroups[0].GroupId' --output text)
if [ "$SG" = "None" ]; then
  SG=$(a ec2 create-security-group --group-name "$NAME-web" --description "80/443 for $NAME" --query GroupId --output text)
  a ec2 authorize-security-group-ingress --group-id "$SG" --ip-permissions \
    'IpProtocol=tcp,FromPort=80,ToPort=80,IpRanges=[{CidrIp=0.0.0.0/0}]' \
    'IpProtocol=tcp,FromPort=443,ToPort=443,IpRanges=[{CidrIp=0.0.0.0/0}]'
fi
ID=$(a ec2 run-instances --image-id "$AMI" --instance-type "$TYPE" --security-group-ids "$SG" $PROFILE_ARG \
  --block-device-mappings 'DeviceName=/dev/sda1,Ebs={VolumeSize=30,VolumeType=gp3}' \
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$NAME}]" \
  --query 'Instances[0].InstanceId' --output text)
a ec2 wait instance-running --instance-ids "$ID"
EIP=$(a ec2 allocate-address --query AllocationId --output text)
a ec2 associate-address --instance-id "$ID" --allocation-id "$EIP" >/dev/null
IP=$(a ec2 describe-addresses --allocation-ids "$EIP" --query 'Addresses[0].PublicIp' --output text)
echo "Instance $ID at $IP. Provision it, e.g. via SSM:"
echo "  curl -fsSL https://raw.githubusercontent.com/komapc/ido-epo-translator/main/infra/host/bootstrap.sh | sudo bash"
