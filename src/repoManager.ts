import { config } from "./config.ts";

export class RepoManager {
  private deploymentsInProgress = new Set<string>();

  private async runCommand(cmd: string[], cwd: string): Promise<string> {
    const process = new Deno.Command(cmd[0], {
      args: cmd.slice(1),
      cwd: cwd,
    });
    
    const { success, stdout, stderr } = await process.output();
    if (!success) {
      throw new Error(new TextDecoder().decode(stderr));
    }
    return new TextDecoder().decode(stdout);
  }

  private async gitClone(repoName: string): Promise<void> {
    const repo = config.repositories.get(repoName);
    if (!repo) throw new Error(`Repository ${repoName} not found`);

    try {
      await this.runCommand([
        "git", "clone",
        "-b", repo.branch,  // Specify the branch to clone
        repo.url,
        repo.name
      ], "./repositories");
    } catch (_error) {
      // If repo exists, pull instead
      await this.gitPull(repoName);
    }
  }

  private async gitPull(repoName: string): Promise<void> {
    const repo = config.repositories.get(repoName);
    if (!repo) throw new Error(`Repository ${repoName} not found`);

    await this.runCommand(
      ["git", "pull", "origin", repo.branch],
      `./repositories/${repo.name}`
    );
  }

  isDeploying(repoName: string): boolean {
    return this.deploymentsInProgress.has(repoName);
  }

  async deploy(repoName: string): Promise<void> {
    const repo = config.repositories.get(repoName);
    if (!repo) throw new Error(`Repository ${repoName} not found`);

    if (this.isDeploying(repoName)) {
      console.log(`Deployment already in progress for ${repoName}, skipping`);
      return;
    }

    this.deploymentsInProgress.add(repoName);
    console.log(`Starting deployment of ${repoName}`);
    
    try {
      // Pull latest code
      console.log("Pulling latest code...");
      await this.gitClone(repoName);

      // Build new images
      console.log("Building new images...");
      await this.runCommand(
        ["docker", "compose", "build"],
        `./repositories/${repo.name}`
      );

      // Stop existing services
      console.log("Stopping existing services...");
      await this.runCommand(
        ["docker", "compose", "down"],
        `./repositories/${repo.name}`
      );

      // Start new services
      console.log("Starting new services...");
      await this.runCommand(
        ["docker", "compose", "up", "-d"],
        `./repositories/${repo.name}`
      );

      console.log(`Deployment of ${repoName} completed successfully`);
    } catch (error) {
      console.error(`Deployment failed: ${error}`);
      throw error;
    } finally {
      this.deploymentsInProgress.delete(repoName);
    }
  }
}