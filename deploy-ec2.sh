#!/bin/bash
set -euo pipefail

# EC2 Deployment Script for Apertium Ido-Epo Translator
# Usage: ./deploy-ec2.sh

EC2_USER="ubuntu"
EC2_IP="52.211.137.158"
SSH_KEY="$HOME/.ssh/apertium.pem"

echo "=== Deploying Apertium to EC2 instance at $EC2_IP ==="

# Step 1: Install Docker on EC2
echo "[1/5] Installing Docker on EC2..."
ssh -i "$SSH_KEY" "$EC2_USER@$EC2_IP" << 'ENDSSH'
set -e
# Install Docker if not already installed
if ! command -v docker &> /dev/null; then
    sudo apt-get update
    sudo apt-get install -y ca-certificates curl
    sudo install -m 0755 -d /etc/apt/keyrings
    sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    sudo chmod a+r /etc/apt/keyrings/docker.asc
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io
    sudo usermod -aG docker ubuntu
    echo "Docker installed successfully"
else
    echo "Docker already installed"
fi
ENDSSH

# Step 2: Create workspace on EC2
echo "[2/5] Creating workspace on EC2..."
ssh -i "$SSH_KEY" "$EC2_USER@$EC2_IP" << 'ENDSSH'
mkdir -p ~/apertium-build
ENDSSH

# Step 3: Copy language repos to EC2
echo "[3/5] Copying language repos to EC2..."
rsync -avz --delete -e "ssh -i $SSH_KEY" \
  /home/mark/apertium-ido-epo/apertium-ido \
  /home/mark/apertium-ido-epo/apertium-epo \
  /home/mark/apertium-ido-epo/apertium-ido-epo \
  "$EC2_USER@$EC2_IP:~/apertium-build/"

# Step 4: Copy Dockerfile
echo "[4/5] Copying Dockerfile..."
cat << 'DOCKERFILE' | ssh -i "$SSH_KEY" "$EC2_USER@$EC2_IP" "cat > ~/apertium-build/Dockerfile"
FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

# Install Apertium and dependencies
RUN apt-get update && apt-get install -y \
    curl ca-certificates gnupg lsb-release \
    autoconf automake libtool pkg-config \
    libxml2-dev libxml2-utils xsltproc flex libicu-dev \
    gawk g++ make git python3 python3-pip python3-venv \
    && curl -sS https://apertium.projectjj.com/apt/install-nightly.sh | bash \
    && apt-get update \
    && apt-get install -y apertium-all-dev \
    && rm -rf /var/lib/apt/lists/*

# Build Ido monolingual
WORKDIR /opt/apertium
COPY apertium-ido /opt/apertium/apertium-ido
RUN cd apertium-ido && \
    ./autogen.sh && \
    ./configure --prefix=/usr/local && \
    make -j$(nproc) && \
    make install && \
    ldconfig

# Build Esperanto monolingual
COPY apertium-epo /opt/apertium/apertium-epo
RUN cd apertium-epo && \
    ln -sf /usr/share/lttoolbox /root/.local/share/lttoolbox || true && \
    ./autogen.sh && \
    ./configure --prefix=/usr/local && \
    make -j$(nproc) && \
    make install && \
    ldconfig

# Build Ido-Epo bilingual (will fail if bidix broken, but continue)
COPY apertium-ido-epo /opt/apertium/apertium-ido-epo
RUN cd apertium-ido-epo && \
    ln -sf apertium-epo.epo.rlx apertium-ido-epo.epo.epo.rlx || true && \
    ./autogen.sh && \
    (./configure --prefix=/usr/local \
      --with-lang1=/opt/apertium/apertium-ido \
      --with-lang2=/opt/apertium/apertium-epo && \
    make -j$(nproc) && \
    make install && \
    ldconfig) || echo "Bilingual build failed (expected if bidix broken)"

# Install APy
WORKDIR /opt
RUN git clone https://github.com/apertium/apertium-apy.git && \
    cd apertium-apy && \
    python3 -m venv venv && \
    . venv/bin/activate && \
    pip install tornado bottle requests pyyaml lxml regex simplejson

# Expose APy port
EXPOSE 2737

# Start APy
WORKDIR /opt/apertium-apy
CMD ["/bin/bash", "-c", "source venv/bin/activate && python3 servlet.py -p 2737 -j1"]
DOCKERFILE

# Step 5: Build and run Docker container on EC2
echo "[5/5] Building and starting Apertium Docker container..."
ssh -i "$SSH_KEY" "$EC2_USER@$EC2_IP" << 'ENDSSH'
set -e
cd ~/apertium-build

# Stop any existing container
docker stop apertium-apy 2>/dev/null || true
docker rm apertium-apy 2>/dev/null || true

# Build image
echo "Building Docker image (this may take 5-10 minutes)..."
docker build -t apertium-ido-epo:latest .

# Run container
echo "Starting APy container..."
docker run -d \
  --name apertium-apy \
  --restart unless-stopped \
  -p 2737:2737 \
  apertium-ido-epo:latest

# Wait for APy to start
echo "Waiting for APy to start..."
sleep 5

# Check container status
docker ps --filter "name=apertium-apy"
docker logs --tail=20 apertium-apy || true
ENDSSH

echo ""
echo "=== Deployment Complete! ==="
echo ""
echo "APy is running at: http://52.211.137.158:2737"
echo ""
echo "Test it:"
echo "  curl http://52.211.137.158:2737/listPairs"
echo ""
echo "View logs:"
echo "  ssh -i ~/.ssh/apertium.pem ubuntu@52.211.137.158 'docker logs -f apertium-apy'"
echo ""
echo "SSH into EC2:"
echo "  ssh -i ~/.ssh/apertium.pem ubuntu@52.211.137.158"
echo ""

