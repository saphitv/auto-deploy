import { config } from "./config.ts";
import { RepoManager } from "./repoManager.ts";
import { Webhooks } from "npm:@octokit/webhooks";
import { ConfigValidator } from "./configValidator.ts";

const repoManager = new RepoManager();

async function verifyWebhookSignature(payload: string, signature: string, secret: string): Promise<boolean> {
  const webhooks = new Webhooks({ secret });
  try {
    await webhooks.verify(payload, signature);
    return true;
  } catch {
    return false;
  }
}

async function validateConfig(): Promise<boolean> {
  console.log("Validating repository configurations...");
  const validator = new ConfigValidator();
  const results = await validator.validateAll();
  
  let isValid = true;
  
  for (const result of results) {
    if (!result.isValid) {
      isValid = false;
      console.error(`❌ Configuration invalid for ${result.repoName}:`);
      for (const error of result.errors) {
        console.error(`   - ${error}`);
      }
    } else {
      console.log(`✅ Configuration valid for ${result.repoName}`);
    }
  }
  
  return isValid;
}

async function checkHealth(): Promise<{ isHealthy: boolean; details: Record<string, boolean> }> {
  const details: Record<string, boolean> = {};
  
  // Check Docker access
  try {
    const process = new Deno.Command("docker", {
      args: ["version"],
    });
    const { success } = await process.output();
    details.docker = success;
  } catch {
    details.docker = false;
  }

  // Check Docker Compose access
  try {
    const process = new Deno.Command("docker", {
      args: ["compose", "version"],
    });
    const { success } = await process.output();
    details.dockerCompose = success;
  } catch {
    details.dockerCompose = false;
  }

  // Check Git access
  try {
    const process = new Deno.Command("git", {
      args: ["--version"],
    });
    const { success } = await process.output();
    details.git = success;
  } catch {
    details.git = false;
  }

  const isHealthy = Object.values(details).every(Boolean);
  return { isHealthy, details };
}

async function handleWebhook(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    console.log("Method not allowed");
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const signature = request.headers.get("x-hub-signature-256");
    if (!signature) {
      console.log("Missing signature");
      return new Response("Missing signature", { status: 401 });
    }

    const bodyText = await request.text();
    const payload = JSON.parse(bodyText);
    const repoName = payload.repository?.name;

    if (!repoName || !config.repositories.has(repoName)) {
      console.log("Repository not configured");
      return new Response("Repository not configured", { status: 400 });
    }

    const repo = config.repositories.get(repoName)!;

    // Verify signature with repository-specific secret
    if (!await verifyWebhookSignature(bodyText, signature, repo.webhookSecret)) {
      console.log("Invalid signature");
      return new Response("Invalid signature", { status: 401 });
    }

    const eventType = request.headers.get("x-github-event");

    // Check if deployment is already in progress
    if (repoManager.isDeploying(repoName)) {
      console.log(`Deployment already in progress for ${repoName}`);
      return new Response("Deployment already in progress", { status: 409 });
    }
    
    // Check if this event type should trigger a deployment
    if (
      (eventType === "push" && repo.triggerOn === "push") ||
      (eventType === "release" && repo.triggerOn === "release" && payload.action === "published")
    ) {
      console.log(`Received ${eventType} webhook for repository: ${repoName}`);
      repoManager.deploy(repoName);
      return new Response("Deployment started", { status: 200 });
    } else {
      console.log(`Ignoring ${eventType} event for ${repoName} (configured to trigger on ${repo.triggerOn})`);
      return new Response("Event type does not trigger deployment", { status: 200 });
    }
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response("Internal server error", { status: 500 });
  }
}

async function handleRequest(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, ''); // Remove trailing slash
    
    // Handle health checks
    if (path === '/health') {
      console.log(`Health check request received from ${request.headers.get("user-agent")}`);
      const health = await checkHealth();
      
      return new Response(JSON.stringify({
        status: health.isHealthy ? "healthy" : "unhealthy",
        details: health.details,
        timestamp: new Date().toISOString()
      }), { 
        status: health.isHealthy ? 200 : 503,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate"
        }
      });
    }

    // Handle webhooks
    return handleWebhook(request);
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response("Internal server error", { status: 500 });
  }
}

// Start the server
const port = 3000;  // This will be mapped to port 8000 in docker-compose
console.log("Starting auto-deploy server...");

// Validate configuration before starting
const configValid = await validateConfig();
if (!configValid) {
  console.error("Server startup failed: Invalid configuration detected");
  Deno.exit(1);
}

console.log(`Configuration valid, starting webhook server on port ${port}...`);
await Deno.serve({ port }, handleRequest);