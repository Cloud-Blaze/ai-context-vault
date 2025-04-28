// God Mode Storage Service
import { decryptPAT } from "../services/patEncryption";

class GodModeStorage {
  constructor() {
    this.storageKey = "godModeLogs";
    this.syncInterval = null;
    this.lastKnownSha = null;
    this.currentSync = null;
  }

  static getInstance() {
    if (!GodModeStorage.instance) {
      GodModeStorage.instance = new GodModeStorage();
    }
    return GodModeStorage.instance;
  }

  async checkEnabledState() {
    return new Promise((resolve) => {
      chrome.storage.local.get(["godModeEnabled"], (result) => {
        resolve(!!result.godModeEnabled);
      });
    });
  }

  async getLogs(chatId) {
    return new Promise((resolve) => {
      chrome.storage.local.get([this.storageKey], (result) => {
        const logs = result[this.storageKey] || { entries: [] };
        resolve(logs);
      });
    });
  }

  async addLog(chatId, logEntry) {
    return new Promise(async (resolve) => {
      const logs = await this.getLogs(chatId);
      logs.entries.push(logEntry);
      chrome.storage.local.set({ [this.storageKey]: logs }, async () => {
        await this.syncToGist();
        resolve();
      });
    });
  }

  async syncToGist() {
    // Abort any in-flight request
    if (this.currentSync && this.currentSync.abort) {
      console.log("[AI Context Vault] Aborting previous God Mode sync");
      this.currentSync.abort();
    }

    const controller = new AbortController();
    const signal = controller.signal;
    this.currentSync = controller;

    // Set up a 20-second timeout
    const timeout = new Promise((_, reject) =>
      setTimeout(() => {
        controller.abort();
        reject(new Error("God Mode sync timed out"));
      }, 20000)
    );

    try {
      const result = await Promise.race([
        this.performGodModeSync(signal),
        timeout,
      ]);
      return result;
    } catch (err) {
      console.error("[AI Context Vault] God Mode sync failed:", err);
    } finally {
      this.currentSync = null;
    }
  }

  async performGodModeSync(signal) {
    const { godModeEncryptedPAT, godModeGistURL } = await new Promise(
      (resolve) => {
        chrome.storage.local.get(
          ["godModeEncryptedPAT", "godModeGistURL"],
          (res) => {
            resolve({
              godModeEncryptedPAT: res.godModeEncryptedPAT || "",
              godModeGistURL: res.godModeGistURL || "",
            });
          }
        );
      }
    );

    if (!godModeEncryptedPAT || !godModeGistURL.includes("/")) {
      console.warn("[AI Context Vault] Missing God Mode Gist configuration");
      return;
    }

    const pat = await decryptPAT(godModeEncryptedPAT);
    const gistId = godModeGistURL.split("/").pop();
    const headers = {
      Authorization: `token ${pat}`,
      "Content-Type": "application/json",
    };

    // Get local data
    const localData = await this.getLogs();
    console.debug("[AI Context Vault] Local God Mode data:", localData);

    // Get remote data
    let remoteData = { entries: [] };
    try {
      const response = await fetch(`https://api.github.com/gists/${gistId}`, {
        method: "GET",
        headers,
        signal,
      });

      if (response.ok) {
        const gist = await response.json();
        const file = gist.files["ai_context_vault_god_mode_data.json"];
        if (file && file.content) {
          try {
            remoteData = JSON.parse(file.content);
            if (!remoteData.entries) {
              remoteData.entries = [];
            }
          } catch (e) {
            console.error("[AI Context Vault] Error parsing remote data:", e);
            remoteData = { entries: [] };
          }
        }
      }
    } catch (e) {
      console.error("[AI Context Vault] Error fetching remote data:", e);
      remoteData = { entries: [] };
    }

    // Ensure local data has entries array
    if (!localData.entries) {
      localData.entries = [];
    }

    // Merge the data
    const mergedEntries = [...(remoteData.entries || [])];

    // Add new local entries that don't exist in remote
    localData.entries.forEach((localEntry) => {
      const exists = mergedEntries.some(
        (remoteEntry) =>
          remoteEntry.metadata?.messageId === localEntry.metadata?.messageId &&
          remoteEntry.metadata?.timestamp === localEntry.metadata?.timestamp
      );
      if (!exists) {
        mergedEntries.push(localEntry);
      }
    });

    const mergedData = { entries: mergedEntries };

    // Save merged data back to local storage
    chrome.storage.local.set({ [this.storageKey]: mergedData });

    // Update GitHub
    const body = {
      description: "AI Context Vault God Mode Sync",
      files: {
        "ai_context_vault_god_mode_data.json": {
          content: JSON.stringify(mergedData, null, 2),
        },
      },
    };

    const patch = await fetch(`https://api.github.com/gists/${gistId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(body),
      signal,
    });

    if (patch.ok) {
      const gist = await patch.json();
      this.lastKnownSha = gist.history[0].version;
      console.log("[AI Context Vault] God Mode sync successful");
    }
  }

  async startPeriodicSync() {
    if (this.syncInterval) return;

    // Check if Gist configuration exists
    const { godModeEncryptedPAT, godModeGistURL } = await new Promise(
      (resolve) => {
        chrome.storage.local.get(
          ["godModeEncryptedPAT", "godModeGistURL"],
          (res) => {
            resolve({
              godModeEncryptedPAT: res.godModeEncryptedPAT || "",
              godModeGistURL: res.godModeGistURL || "",
            });
          }
        );
      }
    );

    if (!godModeEncryptedPAT || !godModeGistURL.includes("/")) {
      console.debug(
        "[AI Context Vault] Missing God Mode Gist configuration, skipping periodic sync"
      );
      return;
    }

    // Sync every 60 seconds
    this.syncInterval = setInterval(() => this.syncToGist(), 60000);

    // Sync when tab becomes visible
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        this.syncToGist();
      }
    });

    // Sync when window gets focus
    window.addEventListener("focus", () => {
      this.syncToGist();
    });
  }

  stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async clearLogs(chatId) {
    try {
      const isGodModeEnabled = await this.checkEnabledState();
      if (!isGodModeEnabled) {
        return;
      }

      const logs = localStorage.getItem(this.storageKey);
      const allLogs = logs ? JSON.parse(logs) : {};

      if (chatId) {
        delete allLogs[chatId];
      } else {
        // Clear all logs if no chatId provided
        Object.keys(allLogs).forEach((key) => {
          delete allLogs[key];
        });
      }

      localStorage.setItem(this.storageKey, JSON.stringify(allLogs));
    } catch (error) {
      console.error("Error clearing logs:", error);
    }
  }
}

export { GodModeStorage };
