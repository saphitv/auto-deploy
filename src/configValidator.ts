import { config } from "./config.ts";
import { RepoConfig } from "./configUtils.ts";

export interface ValidationResult {
  repoName: string;
  isValid: boolean;
  errors: string[];
}

interface SystemCheckResult {
  docker: boolean;
  dockerCompose: boolean;
  ssh: boolean;
  errors: string[];
}

export class ConfigValidator {
  private async checkSystemRequirements(): Promise<SystemCheckResult> {
    const errors: string[] = [];
    let docker = false;
    let dockerCompose = false;
    let ssh = false;

    try {
      const process = new Deno.Command("docker", {
        args: ["version"],
      });
      const { success } = await process.output();
      docker = success;
      if (!success) {
        errors.push("Docker is not accessible. Make sure Docker daemon is running.");
      }
    } catch {
      errors.push("Docker is not installed or not in PATH");
    }

    try {
      const process = new Deno.Command("docker", {
        args: ["compose", "version"],
      });
      const { success } = await process.output();
      dockerCompose = success;
      if (!success) {
        errors.push("Docker Compose plugin is not working correctly");
      }
    } catch {
      errors.push("Docker Compose plugin is not installed");
    }

    // Check SSH and GitHub connectivity
    try {
      const process = new Deno.Command("ssh", {
        args: ["-T", "git@github.com"],
      });
      const { code } = await process.output();
      // GitHub returns 1 for successful auth
      ssh = code === 1;
      if (!ssh) {
        errors.push("SSH connection to GitHub failed. Check your SSH key configuration.");
      }
    } catch {
      errors.push("SSH is not configured correctly. Make sure your SSH key is properly set up.");
    }

    return { docker, dockerCompose, ssh, errors };
  }

  async validateAll(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    // Check system requirements first
    const sysCheck = await this.checkSystemRequirements();
    if (sysCheck.errors.length > 0) {
      results.push({
        repoName: "system",
        isValid: false,
        errors: sysCheck.errors
      });
      return results; // Don't continue if system requirements aren't met
    }
    
    for (const [repoName, repo] of config.repositories.entries()) {
      try {
        await this.validateRepository(repo);
        results.push({
          repoName: repoName as string,
          isValid: true,
          errors: []
        });
      } catch (error) {
        results.push({
          repoName: repoName as string,
          isValid: false,
          errors: Array.isArray(error) ? error : [(error instanceof Error ? error.message : String(error))]
        });
      }
    }
    
    return results;
  }

  private async validateRepository(repo: Required<RepoConfig>): Promise<void> {
    const errors: string[] = [];

    // Validate webhook secret
    if (!repo.webhookSecret || repo.webhookSecret === "your-webhook-secret") {
      errors.push(`Missing webhook secret. Please set WEBHOOK_SECRET_${repo.name.toUpperCase()} environment variable or configure it explicitly.`);
    }

    // Validate URL format and accessibility
    try {
      const repoExists = await this.checkRepoExists(repo.url);
      if (!repoExists) {
        errors.push(`Repository not accessible at ${repo.url}`);
      } else {
        const branchExists = await this.checkBranchExists(repo.url, repo.branch);
        if (!branchExists) {
          errors.push(`Branch '${repo.branch}' does not exist in repository ${repo.url}`);
        }
      }
    } catch (error) {
      errors.push(`Failed to validate repository: ${error instanceof Error ? error.message : String(error)}`);
    }

    if (errors.length > 0) {
      throw errors;
    }
  }

  private async checkRepoExists(url: string): Promise<boolean> {
    try {
      const apiUrl = this.getGithubApiUrl(url);
      const response = await fetch(apiUrl);
      return response.status === 200;
    } catch {
      return false;
    }
  }

  private async checkBranchExists(url: string, branch: string): Promise<boolean> {
    try {
      const apiUrl = `${this.getGithubApiUrl(url)}/branches/${branch}`;
      const response = await fetch(apiUrl);
      return response.status === 200;
    } catch {
      return false;
    }
  }

  private getGithubApiUrl(repoUrl: string): string {
    const url = new URL(repoUrl);
    const [, owner, repo] = url.pathname.split('/');
    return `https://api.github.com/repos/${owner}/${repo}`;
  }
}