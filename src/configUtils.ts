export function extractOwnerAndRepo(url: string): { owner: string; repo: string } | null {
  // Try HTTPS format first
  let match = url.match(/github\.com\/([^/]+)\/([^/.]+)/);
  if (match) {
    return { owner: match[1], repo: match[2] };
  }

  // Try SSH format
  match = url.match(/git@github\.com:([^/]+)\/([^/.]+)/);
  if (match) {
    return { owner: match[1], repo: match[2] };
  }

  return null;
}

export function getDefaultConfig(repoName: string, partialConfig: RepoConfig): Required<RepoConfig> {
  // Get the owner from the config, URL, or default to saphitv
  let owner = partialConfig.owner;
  if (!owner && partialConfig.url) {
    const extracted = extractOwnerAndRepo(partialConfig.url);
    if (extracted) {
      owner = extracted.owner;
    }
  }
  if (!owner) {
    owner = "saphitv";  // Default owner
  }

  const defaults: Required<RepoConfig> = {
    name: repoName,
    owner,
    url: partialConfig.url || `https://github.com/${owner}/${repoName}`,
    branch: "main",
    dockerComposePath: "./docker-compose.yaml",
    triggerOn: partialConfig.triggerOn,
    webhookSecret: Deno.env.get(`WEBHOOK_SECRET_${repoName.toUpperCase().replaceAll("-", "_")}`)!
  };

  return {
    ...defaults,
    ...removeUndefined(partialConfig)
  };
}

// Helper to remove undefined values from an object
export function removeUndefined<T>(obj: T): T {
  const result = {} as T;
  for (const key in obj) {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  return result;
}

export interface RepoConfig {
  name?: string;  // Optional, defaults to key in the Map
  owner?: string; // Optional, defaults to saphitv
  url?: string;   // Optional, defaults to https://github.com/{owner}/{name}
  branch?: string; // Optional, defaults to "main"
  dockerComposePath?: string; // Optional, defaults to "./docker-compose.yaml"
  triggerOn: "push" | "release";  // Required since there's no sensible default
  webhookSecret?: string; // Optional, defaults to WEBHOOK_SECRET_{NAME}
}