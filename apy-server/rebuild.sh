#!/bin/bash
# Script to rebuild Apertium dictionaries inside the container

set -e

echo "=== Rebuilding Apertium Ido-Esperanto Translator ==="

# Update repositories
echo "Pulling latest code..."
cd /opt/apertium/apertium-ido
git fetch origin
git reset --hard origin/main

cd /opt/apertium/apertium-epo  
git fetch origin
git reset --hard origin/master

cd /opt/apertium/apertium-ido-epo
git fetch origin
git reset --hard origin/main

# Rebuild apertium-ido
echo "Rebuilding apertium-ido..."
cd /opt/apertium/apertium-ido
make clean
./autogen.sh
./configure
make
make install
ldconfig

# Rebuild apertium-epo
echo "Rebuilding apertium-epo..."
cd /opt/apertium/apertium-epo
make clean
./autogen.sh
./configure
make
make install
ldconfig

# Rebuild apertium-ido-epo
echo "Rebuilding apertium-ido-epo..."
cd /opt/apertium/apertium-ido-epo
make clean
./autogen.sh
./configure
make
make install
ldconfig

echo "=== Rebuild complete! ==="
echo "Restart the APy server to use the new dictionaries."

