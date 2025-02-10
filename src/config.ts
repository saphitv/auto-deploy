import { RepoConfig, getDefaultConfig } from "./configUtils.ts";

export const config = {
  repositories: new Map([
    // Minimal configuration - just specify trigger type
    // Will use saphitv as owner by default
    ["AM-Suisse", { 
      triggerOn: "release" 
    }],
  ].map(([name, config]) => [name, getDefaultConfig(name as string, config as RepoConfig)]))
};

export type { RepoConfig };