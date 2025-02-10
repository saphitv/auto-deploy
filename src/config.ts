import { RepoConfig, getDefaultConfig } from "./configUtils.ts";

export const config = {
  repositories: new Map([
    // Minimal configuration - just specify trigger type
    // Will use saphitv as owner by default
    ["docker-hello-world", { 
      triggerOn: "release" 
    }],
    
    // Example with explicit owner override
    ["my-service", { 
      owner: "different-org",  // Override default saphitv owner
      triggerOn: "push" 
    }],

    // Full custom configuration example
    ["special-app", {
      url: "git@github.com:another-org/different-name.git",  // Complete override of URL
      branch: "develop",
      dockerComposePath: "./compose.yml",
      webhookSecret: Deno.env.get("WEBHOOK_SECRET_SPECIAL") || "your-webhook-secret",
      triggerOn: "push"
    }]
  ].map(([name, config]) => [name, getDefaultConfig(name as string, config as RepoConfig)]))
};

export type { RepoConfig };