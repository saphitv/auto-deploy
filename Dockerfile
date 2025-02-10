FROM denoland/deno:latest

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