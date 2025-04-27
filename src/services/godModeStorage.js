// God Mode Storage Service
class GodModeStorage {
  constructor() {
    this.storageKey = "godModeLogs";
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
    try {
      const isGodModeEnabled = await this.checkEnabledState();
      if (!isGodModeEnabled) {
        return { chatId, summary: "", entries: [] };
      }

      const logs = localStorage.getItem(this.storageKey);
      const allLogs = logs ? JSON.parse(logs) : {};
      return allLogs[chatId] || { chatId, summary: "", entries: [] };
    } catch (error) {
      console.error("Error getting logs:", error);
      return { chatId, summary: "", entries: [] };
    }
  }

  async addLog(chatId, log) {
    try {
      const isGodModeEnabled = await this.checkEnabledState();
      if (!isGodModeEnabled) {
        return;
      }

      // Validate log content
      if (
        !log ||
        (!log.content && !log.metadata?.imageUrl) ||
        (log.content && typeof log.content !== "string")
      ) {
        console.warn("[AI Context Vault] Invalid log content:", log);
        return;
      }

      // Trim and validate content
      const trimmedContent = log.content.trim();
      if (
        (!log.content && !log.metadata?.imageUrl && !trimmedContent) ||
        (!log.content && !log.metadata?.imageUrl && trimmedContent === "") ||
        (!log.content && !log.metadata?.imageUrl && trimmedContent === " ")
      ) {
        console.warn("[AI Context Vault] Empty or whitespace-only log content");
        return;
      }

      // Additional validation for AI responses
      if (
        !log.content &&
        !log.metadata?.imageUrl &&
        log.type === "output" &&
        trimmedContent === "Generated image"
      ) {
        // Only allow "Generated image" if there's actual image data
        if (!log.metadata?.imageUrl && !log.metadata?.imageBlob) {
          console.warn(
            "[AI Context Vault] Image generation log without image data"
          );
          return;
        }
      }

      const logs = localStorage.getItem(this.storageKey);
      const allLogs = logs ? JSON.parse(logs) : {};
      const chatLogs = allLogs[chatId] || { chatId, summary: "", entries: [] };

      // Check if this exact content already exists in recent logs (last 10)
      const recentLogs = chatLogs.entries;
      const isDuplicate = recentLogs.some(
        (existingLog) =>
          existingLog.text === trimmedContent && existingLog.type === log.type
      );

      if (!isDuplicate) {
        chatLogs.entries.push({
          id: `entry_${Date.now()}`,
          text: trimmedContent,
          type: log.type,
          metadata: log.metadata || {},
          created: Date.now(),
          lastModified: Date.now(),
        });

        allLogs[chatId] = chatLogs;
        localStorage.setItem(this.storageKey, JSON.stringify(allLogs));
      }
    } catch (error) {
      console.error("Error adding log:", error);
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
