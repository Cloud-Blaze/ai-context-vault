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
    this.dbName = "aiContextVault";
    this.storeName = "godModeLogs";
    this.db = null;
    this.initPromise = this.initDB();
  }

  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 2);

      request.onerror = () => {
        console.error("[AI Context Vault] Failed to open IndexedDB");
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: "id" });
          store.createIndex("chatId", "metadata.chatId", { unique: false });
          store.createIndex("messageId", "metadata.messageId", {
            unique: false,
          });
          store.createIndex("timestamp", "metadata.timestamp", {
            unique: false,
          });
        }
      };
    });
  }

  async getDB() {
    await this.initPromise;
    return this.db;
  }

  static getInstance() {
    if (!GodModeStorage.instance) {
      GodModeStorage.instance = new GodModeStorage();
    }
    return GodModeStorage.instance;
  }

  async checkEnabledState() {
    const db = await this.getDB();
    return new Promise((resolve) => {
      const transaction = db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.get("godModeEnabled");

      request.onsuccess = () => {
        resolve(!!request.result?.value);
      };
    });
  }

  async getLogs(chatId) {
    const db = await this.getDB();
    return new Promise((resolve) => {
      if (!chatId) {
        resolve({ entries: [] });
        return;
      }

      const transaction = db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const index = store.index("chatId");
      const request = index.getAll(chatId);

      request.onsuccess = async () => {
        const entries = request.result || [];

        // Process entries to include binary data if needed
        const processedEntries = await Promise.all(
          entries.map(async (entry) => {
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

        // Filter entries to ensure they have content
        const filteredEntries = processedEntries.filter((entry) => {
          const hasText =
            (entry.text && entry.text.trim() !== "") ||
            (entry.content && entry.content.trim() !== "");
          const hasImage =
            entry.metadata &&
            (entry.metadata.imageBlob || entry.metadata.imageUrl);
          return hasText || hasImage;
        });

        resolve({ entries: filteredEntries });
      };
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
    const db = await this.getDB();
    return new Promise(async (resolve) => {
      const normalizedEntry = {
        id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        ...logEntry,
        text: logEntry.text || logEntry.content || "",
        type: logEntry.type || "output",
        metadata: {
          ...(logEntry.metadata || {}),
          chatId,
          timestamp: Date.now(),
        },
      };

      // Handle image blob if present
      if (
        normalizedEntry.metadata?.imageBlob &&
        normalizedEntry.metadata.imageBlob instanceof Blob
      ) {
        try {
          const imageHash = await this.calculateImageHash(
            normalizedEntry.metadata.imageBlob
          );

          if (this.imageHashStore.has(imageHash)) {
            normalizedEntry.metadata.binaryDataId =
              this.imageHashStore.get(imageHash);
            delete normalizedEntry.metadata.imageBlob;
          } else {
            const binaryDataId = `binary_${Date.now()}_${Math.random()
              .toString(36)
              .substring(2, 11)}`;

            await indexedDBStorage.storeBinaryData(
              binaryDataId,
              normalizedEntry.metadata.imageBlob
            );

            this.imageHashStore.set(imageHash, binaryDataId);
            normalizedEntry.metadata.binaryDataId = binaryDataId;
            delete normalizedEntry.metadata.imageBlob;
          }
        } catch (error) {
          console.error("[AI Context Vault] Error processing image:", error);
        }
      }

      const transaction = db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.put(normalizedEntry);

      request.onsuccess = () => resolve();
      request.onerror = (error) => {
        console.error("[AI Context Vault] Error adding log:", error);
        resolve();
      };
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

    // Save merged data to IndexedDB
    const db = await this.getDB();
    await new Promise((resolve) => {
      const transaction = db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);

      // Clear existing data
      const clearRequest = store.clear();
      clearRequest.onsuccess = () => {
        // Add merged entries
        const addPromises = mergedEntries.map((entry) => {
          return new Promise((resolveAdd) => {
            const addRequest = store.put(entry);
            addRequest.onsuccess = () => resolveAdd();
            addRequest.onerror = (error) => {
              console.error(
                "[AI Context Vault] Error adding merged entry:",
                error
              );
              resolveAdd();
            };
          });
        });

        Promise.all(addPromises).then(() => resolve());
      };
    });

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
    const db = await this.getDB();
    return new Promise(async (resolve) => {
      try {
        const isGodModeEnabled = await this.checkEnabledState();
        if (!isGodModeEnabled) {
          resolve();
          return;
        }

        if (chatId) {
          // Clear logs for specific chat
          const transaction = db.transaction([this.storeName], "readwrite");
          const store = transaction.objectStore(this.storeName);
          const index = store.index("chatId");
          const request = index.getAll(chatId);

          request.onsuccess = async () => {
            const entries = request.result || [];
            await Promise.all(
              entries.map(async (entry) => {
                if (entry.metadata?.binaryDataId) {
                  await indexedDBStorage.deleteBinaryData(
                    entry.metadata.binaryDataId
                  );
                  const hashToRemove = Array.from(
                    this.imageHashStore.entries()
                  ).find(([_, id]) => id === entry.metadata.binaryDataId);
                  if (hashToRemove) {
                    this.imageHashStore.delete(hashToRemove[0]);
                  }
                }
                store.delete(entry.id);
              })
            );
            resolve();
          };
        } else {
          // Clear all logs
          const transaction = db.transaction([this.storeName], "readwrite");
          const store = transaction.objectStore(this.storeName);
          const request = store.clear();

          request.onsuccess = async () => {
            await indexedDBStorage.clearAll();
            this.imageHashStore.clear();
            resolve();
          };
        }
      } catch (error) {
        console.error("[AI Context Vault] Error clearing logs:", error);
        resolve();
      }
    });
  }
}

export { GodModeStorage };
