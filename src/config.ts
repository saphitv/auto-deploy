interface RepoConfig {
  name: string;
  url: string;
  branch: string;
  dockerComposePath: string;
  triggerOn: "push" | "release";
}

export const config = {
  webhookSecret: Deno.env.get("WEBHOOK_SECRET") || "your-webhook-secret",
  repositories: new Map<string, RepoConfig>([
    ["docker-hello-world", {
      name: "docker-hello-world",
      url: "https://github.com/saphitv/docker-hello-world",
      branch: "master",
      dockerComposePath: "./docker-compose.yaml",
      triggerOn: "release"
    }]
  ])
};