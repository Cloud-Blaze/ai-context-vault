// GitHub Settings Service
class GitHubSettings {
  constructor() {
    this.storageKey = "githubSettings";
  }

  static getInstance() {
    if (!GitHubSettings.instance) {
      GitHubSettings.instance = new GitHubSettings();
    }
    return GitHubSettings.instance;
  }

  async getSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get(["githubPat", "githubUrl"], (result) => {
        resolve({
          pat: result.githubPat || "",
          url: result.githubUrl || "",
        });
      });
    });
  }

  async setSettings({ pat, url }) {
    return new Promise((resolve) => {
      chrome.storage.local.set(
        {
          githubPat: pat,
          githubUrl: url,
        },
        () => resolve()
      );
    });
  }

  async validateSettings() {
    const settings = await this.getSettings();
    return !!settings.pat && !!settings.url;
  }
}

export const GitHubSettings = GitHubSettings;
