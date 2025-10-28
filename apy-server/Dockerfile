FROM debian:bookworm-slim

ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8

# Install base dependencies + build tools
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    gnupg \
    lsb-release \
    python3 \
    python3-pip \
    git \
    build-essential \
    autoconf \
    automake \
    libtool \
    pkg-config \
    libxml2-dev \
    libxml2-utils \
    xsltproc \
    flex \
    libicu-dev \
    gawk \
    && rm -rf /var/lib/apt/lists/*

# Add Apertium nightly apt repo and install engine + dev tools
RUN curl -sS https://apertium.projectjj.com/apt/install-nightly.sh | bash && \
    apt-get update && apt-get install -y \
      apertium \
      lttoolbox \
      apertium-all-dev \
      apertium-epo \
      && rm -rf /var/lib/apt/lists/*

# Build ido dictionary from source (not in apt)
WORKDIR /opt/apertium
RUN git clone https://github.com/komapc/apertium-ido.git && \
    cd apertium-ido && \
    ./autogen.sh && ./configure && make && make install && \
    ldconfig

# Build ido-epo bilingual dictionary from source (not in apt)
# Note: This requires ido to be installed first
RUN git clone https://github.com/komapc/apertium-ido-epo.git && \
    cd apertium-ido-epo && \
    ./autogen.sh && ./configure && make && make install && \
    ldconfig

# Clone epo repo for rebuild functionality (already installed via apt)
RUN cd /opt/apertium && git clone https://github.com/apertium/apertium-epo.git

# Copy rebuild scripts
COPY rebuild.sh /opt/apertium/rebuild.sh
COPY rebuild-self-updating.sh /opt/apertium/rebuild-self-updating.sh
COPY pull-repo.sh /opt/apertium/pull-repo.sh
COPY build-repo.sh /opt/apertium/build-repo.sh
RUN chmod +x /opt/apertium/*.sh

# Install APy (Apertium APy server)
WORKDIR /opt
RUN git clone https://github.com/apertium/apertium-apy.git && \
    cd apertium-apy && \
    pip3 install --break-system-packages apertium-streamparser chardet requests tornado commentjson lxml fasttext-wheel==0.9.2

# Expose APy port
EXPOSE 2737

# Startup script - use /usr/local/share for custom built dictionaries
RUN echo '#!/bin/bash\n\
set -e\n\
cd /opt/apertium-apy\n\
python3 apy.py -p 2737 -j1 /usr/local/share/apertium/modes/\n\
' > /start.sh && chmod +x /start.sh

WORKDIR /opt/apertium-apy
CMD ["/start.sh"]
