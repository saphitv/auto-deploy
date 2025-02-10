FROM denoland/deno:1.37

# Install Docker CLI and required tools
RUN apt-get update && apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    netcat \
    && curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list \
    && apt-get update \
    && apt-get install -y docker-ce-cli docker-compose-plugin \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Add a script to wait for Docker daemon
COPY <<EOF /wait-for-docker.sh
#!/bin/sh
while ! nc -z host.docker.internal 2375; do
  echo "Waiting for Docker daemon..."
  sleep 1
done
echo "Docker daemon is available"
EOF

RUN chmod +x /wait-for-docker.sh

# Cache the dependencies
COPY deps.ts* .
RUN if [ -f deps.ts ]; then deno cache deps.ts; fi

# Copy application files
COPY . .

# Create repositories directory
RUN mkdir -p repositories

# Cache the application
RUN deno cache server.ts

# Run the application with Docker check
CMD ["/bin/sh", "-c", "/wait-for-docker.sh && deno run --allow-net --allow-run --allow-read --allow-env server.ts"]