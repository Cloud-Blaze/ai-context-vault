// God Mode Storage Service
import { decryptPAT } from "./patEncryption";
import indexedDBStorage from "./indexedDBStorage";

class GodModeStorage {
  constructor() {
    this.storageKey = "godModeLogs";
    this.syncInterval = null;
    this.lastKnownSha = null;
    this.currentSync = null;
    this.imageHashStore = new Map(); // Store image hashes to prevent duplicates
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
      if (!chatId) {
        resolve({ entries: [] });
        return;
      }
      chrome.storage.local.get([this.storageKey], async (result) => {
        const logs = result[this.storageKey] || { entries: [] };
        // Patch old entries to include chatId if missing
        logs.entries = await Promise.all(
          logs.entries.map(async (entry) => {
            if (!entry.metadata) entry.metadata = {};
            if (chatId && !entry.metadata.chatId)
              entry.metadata.chatId = chatId;

            // If there's a binary data reference, fetch it from IndexedDB
            if (entry.metadata?.binaryDataId) {
              try {
                const binaryData = await indexedDBStorage.getBinaryData(
                  entry.metadata.binaryDataId
                );
                if (binaryData) {
                  entry.metadata.imageBlob = binaryData;
                }
              } catch (error) {
                console.error(
                  "[AI Context Vault] Error fetching binary data:",
                  error
                );
              }
            }

            return entry;
          })
        );

        let filteredEntries = logs.entries;
        if (chatId) {
          filteredEntries = logs.entries.filter(
            (entry) => entry.metadata?.chatId === chatId
          );
        }
        // Only allow entries with text/content or with an image in metadata
        filteredEntries = filteredEntries.filter((entry) => {
          const hasText =
            (entry.text && entry.text.trim() !== "") ||
            (entry.content && entry.content.trim() !== "");
          const hasImage =
            entry.metadata &&
            (entry.metadata.imageBlob || entry.metadata.imageUrl);
          return hasText || hasImage;
        });
        resolve({ entries: filteredEntries });
      });
    });
  }

  async calculateImageHash(blob) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        // Create a simple hash of the image data
        const data = reader.result;
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
          const char = data.charCodeAt(i);
          hash = (hash << 5) - hash + char;
          hash = hash & hash; // Convert to 32bit integer
        }
        resolve(hash.toString(16));
      };
      reader.readAsDataURL(blob);
    });
  }

  async addLog(chatId, logEntry) {
    return new Promise(async (resolve) => {
      const logs = await this.getLogs(chatId);
      // Always ensure chatId is present in metadata
      const normalizedEntry = {
        ...logEntry,
        text: logEntry.text || logEntry.content || "",
        type: logEntry.type || "output",
        metadata: {
          ...(logEntry.metadata || {}),
          chatId,
        },
      };

      // If there's an image blob, check for duplicates before storing
      if (
        normalizedEntry.metadata?.imageBlob &&
        normalizedEntry.metadata.imageBlob instanceof Blob
      ) {
        try {
          // Calculate hash of the image
          const imageHash = await this.calculateImageHash(
            normalizedEntry.metadata.imageBlob
          );

          // Check if we've seen this image before
          if (this.imageHashStore.has(imageHash)) {
            // Use the existing binary data ID instead of storing a duplicate
            normalizedEntry.metadata.binaryDataId =
              this.imageHashStore.get(imageHash);
            delete normalizedEntry.metadata.imageBlob;
            console.log("[AI Context Vault] Skipping duplicate image");
          } else {
            // Generate a unique ID for the binary data
            const binaryDataId = `binary_${Date.now()}_${Math.random()
              .toString(36)
              .substr(2, 9)}`;

            // Store the binary data in IndexedDB
            await indexedDBStorage.storeBinaryData(
              binaryDataId,
              normalizedEntry.metadata.imageBlob
            );

            // Store the hash and ID for future reference
            this.imageHashStore.set(imageHash, binaryDataId);

            // Replace the blob with a reference ID
            normalizedEntry.metadata.binaryDataId = binaryDataId;
            delete normalizedEntry.metadata.imageBlob;
          }
        } catch (error) {
          console.error("[AI Context Vault] Error processing image:", error);
        }
      }

      logs.entries.push(normalizedEntry);
      chrome.storage.local.set({ [this.storageKey]: logs }, () => {
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
    //const mergedData = { entries: [] };

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

      const logs = await this.getLogs(chatId);

      // Clear binary data from IndexedDB
      if (chatId) {
        // Clear binary data for specific chat
        const chatEntries = logs.entries.filter(
          (entry) => entry.metadata?.chatId === chatId
        );
        await Promise.all(
          chatEntries.map(async (entry) => {
            if (entry.metadata?.binaryDataId) {
              await indexedDBStorage.deleteBinaryData(
                entry.metadata.binaryDataId
              );
              // Remove from hash store if this was the last reference
              const hashToRemove = Array.from(
                this.imageHashStore.entries()
              ).find(([_, id]) => id === entry.metadata.binaryDataId);
              if (hashToRemove) {
                this.imageHashStore.delete(hashToRemove[0]);
              }
            }
          })
        );
      } else {
        // Clear all binary data
        await indexedDBStorage.clearAll();
        this.imageHashStore.clear(); // Clear the hash store
      }

      // Clear the logs from chrome.storage.local
      if (chatId) {
        const filteredEntries = logs.entries.filter(
          (entry) => entry.metadata?.chatId !== chatId
        );
        chrome.storage.local.set({
          [this.storageKey]: { entries: filteredEntries },
        });
      } else {
        chrome.storage.local.set({ [this.storageKey]: { entries: [] } });
      }
    } catch (error) {
      console.error("Error clearing logs:", error);
    }
  }
}

export { GodModeStorage };
