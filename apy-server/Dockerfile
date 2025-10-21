FROM debian:bookworm-slim

# Install base dependencies
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    gnupg \
    lsb-release \
    python3 \
    python3-pip \
    git \
    && rm -rf /var/lib/apt/lists/*

# Add Apertium nightly apt repo and install engine + language packages
RUN curl -sS https://apertium.projectjj.com/apt/install-nightly.sh | bash && \
    apt-get update && apt-get install -y \
      apertium \
      lttoolbox \
      apertium-ido \
      apertium-epo \
      apertium-ido-epo \
      && rm -rf /var/lib/apt/lists/*

# Install APy (Apertium APy server)
WORKDIR /opt
RUN git clone https://github.com/apertium/apertium-apy.git && \
    cd apertium-apy && \
    pip3 install --break-system-packages -r requirements.txt

# Expose APy port
EXPOSE 2737

# Startup script
RUN echo '#!/bin/bash\n\
set -e\n\
cd /opt/apertium-apy\n\
python3 servlet.py -p 2737 -j1\n\
' > /start.sh && chmod +x /start.sh

WORKDIR /opt/apertium-apy
CMD ["/start.sh"]

