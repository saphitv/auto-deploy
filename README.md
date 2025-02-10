# Auto-Deploy with GitHub Webhooks

A Deno application that automatically deploys repositories using Docker Compose when triggered by GitHub webhooks.

## Prerequisites

- Deno
- Docker and Docker Compose
- Git

## Setup

1. Configure your repositories in `config.ts`
2. Set the `WEBHOOK_SECRET` environment variable or update it in the config
3. Create a `repositories` directory in the project root:
   ```bash
   mkdir repositories
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
   - Secret: Same as your `WEBHOOK_SECRET`
   - Events: Select "Push" events

## How it Works

1. When a push event is received, the server verifies the webhook signature
2. If valid, it pulls the latest code from the repository
3. It manages two versions of each service:
   - Brings down the currently active version if it exists
   - Deploys the new version using Docker Compose
4. Alternates between two states to ensure zero-downtime deployments