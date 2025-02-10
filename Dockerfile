FROM denoland/deno:latest

# Install Docker CLI and required tools
RUN apt-get update && apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    openssh-client \
    && curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list \
    && apt-get update \
    && apt-get install -y docker-ce-cli docker-compose-plugin curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Create SSH directory and set permissions
RUN mkdir -p /root/.ssh && chmod 700 /root/.ssh


# Cache the dependencies
COPY src/deps.ts* .
RUN if [ -f deps.ts ]; then deno cache deps.ts; fi

# Copy application files
COPY . .

# Create repositories directory
RUN mkdir -p repositories

# Cache the application
RUN deno cache src/server.ts

# Add Github to known hosts
RUN ssh-keyscan github.com >> /root/.ssh/known_hosts

CMD ["deno", "run", "--allow-net", "--allow-run", "--allow-read", "--allow-env", "src/server.ts"]