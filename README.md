# Auto-Deploy with GitHub Webhooks

A Deno application that automatically deploys repositories using Docker Compose when triggered by GitHub webhooks.

## Prerequisites

- Deno
- Docker and Docker Compose
- Git

## Setup

1. Configure your repositories in `config.ts`:
   ```typescript
   {
     repositories: new Map([
       ["your-repo-name", {
         name: "your-repo-name",
         url: "https://github.com/user/repo",
         branch: "main",
         dockerComposePath: "./docker-compose.yml",
         triggerOn: "release",  // or "push"
         webhookSecret: Deno.env.get("WEBHOOK_SECRET_YOUR_REPO") || "your-secret"
       }]
     ])
   }
   ```

2. Set environment variables for each repository's webhook secret:
   ```bash
   export WEBHOOK_SECRET_YOUR_REPO="your-secret-here"
   export WEBHOOK_SECRET_ANOTHER_REPO="another-secret-here"
   ```

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
   - Secret: Use the webhook secret configured for this specific repository
   - Events: Select "Push" or "Releases" events based on your configuration

## How it Works

1. When a webhook is received, the server:
   - Identifies the repository from the payload
   - Verifies the webhook signature using that repository's specific secret
   - Checks if the event type matches the repository's trigger configuration
2. If valid, it pulls the latest code from the repository
3. Deployment process:
   - Builds new images
   - Takes down existing services
   - Brings up new services with the updated code
4. Multiple repositories can be deployed independently with their own configurations and secrets