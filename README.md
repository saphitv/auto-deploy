# Auto-Deploy with GitHub Webhooks

A Deno application that automatically deploys repositories using Docker Compose when triggered by GitHub webhooks.

## Prerequisites

- Docker and Docker Compose

## Private Repository Access

1. Generate an SSH key if you don't have one:
   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com"
   ```

2. Add the public key to your GitHub account:
   - Copy the content of `~/.ssh/id_ed25519.pub`
   - Go to GitHub Settings -> SSH and GPG keys -> New SSH key
   - Paste your public key and save

3. When running with Docker Compose, specify your SSH key path in `.env`:
   ```bash
   SSH_KEY_PATH=/path/to/your/.ssh/id_ed25519
   ```
   If not specified, it will default to `~/.ssh/id_rsa`

4. Make sure your SSH key has the correct permissions:
   ```bash
   chmod 600 ~/.ssh/id_ed25519
   ```

## Running with Docker Compose

1. Create a `.env` file with your webhook secrets:
   ```bash
   WEBHOOK_SECRET_MY_APP=secret123
   WEBHOOK_SECRET_BACKEND_API=secret456
   ```

2. Start the server:
   ```bash
   docker compose up -d
   ```

   The server will be available on port 8000.

## Local Development Prerequisites

- Deno
- Docker and Docker Compose
- Git

## Local Development Setup

1. Configure your repositories in `config.ts`. You only need to specify the trigger type, all other fields are optional with smart defaults:

   ```typescript
   import { RepoConfig, getDefaultConfig } from "./repoUtils.ts";

   {
     repositories: new Map([
       // Minimal config - just specify trigger type
       // Will use saphitv as the default owner
       ["my-app", { 
         triggerOn: "push"  // or "release"
       }],

       // Override default owner
       ["backend-api", {
         owner: "different-org",
         triggerOn: "release"
       }],

       // Full custom config when needed
       ["custom-app", {
         url: "git@github.com:another-org/different-name.git",
         branch: "develop",
         dockerComposePath: "./compose.yml",
         webhookSecret: "custom-secret",
         triggerOn: "push"
       }]
     ])
   }
   ```

   ### Default Values
   - `name`: Same as the key in the Map
   - `owner`: "saphitv" (can be overridden with `owner` field)
   - `url`: `https://github.com/{owner}/{name}`
   - `branch`: "main"
   - `dockerComposePath`: "./docker-compose.yaml"
   - `webhookSecret`: Environment variable `WEBHOOK_SECRET_{REPO_NAME_UPPERCASE}`

2. Set environment variables (`.env` file) for webhook secrets (one per repository):
   ```bash
   export WEBHOOK_SECRET_MY_APP="secret123"
   export WEBHOOK_SECRET_BACKEND_API="secret456"
   ```

## Running the Server

```bash
deno run --allow-net --allow-run --allow-read --allow-env server.ts
```

## GitHub Webhook Configuration

1. Go to your GitHub repository settings
2. Navigate to Webhooks
3. Add webhook:
   - Payload URL: `http://your-server:8000`
   - Content type: `application/json`
   - Secret: Use the corresponding `WEBHOOK_SECRET_{REPO_NAME_UPPERCASE}` value
   - Events: Select based on your `triggerOn` configuration:
     - "Releases" if configured with `triggerOn: "release"`
     - "Pushes" if configured with `triggerOn: "push"`

## How it Works

1. When a webhook is received, the server:
   - Identifies the repository from the payload
   - Verifies the webhook signature using the repository's secret
   - Checks if the event type matches the repository's trigger configuration
2. If valid, it pulls the latest code from the repository
3. Deployment process:
   - Builds new images
   - Takes down existing services
   - Brings up new services with the updated code