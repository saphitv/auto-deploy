interface RepoConfig {
  name: string;
  url: string;
  branch: string;
  dockerComposePath: string;
  triggerOn: "push" | "release";
  webhookSecret: string;  // Add webhook secret per repository
}

export const config = {
  repositories: new Map<string, RepoConfig>([
    ["docker-hello-world", {
      name: "docker-hello-world",
      url: "https://github.com/saphitv/docker-hello-world",
      branch: "master",
      dockerComposePath: "./docker-compose.yaml",
      triggerOn: "release",
      webhookSecret: Deno.env.get("WEBHOOK_SECRET_DOCKER_HELLO_WORLD") || "your-webhook-secret"
    }]
  ])
};