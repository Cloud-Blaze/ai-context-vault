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

      const logs = localStorage.getItem(this.storageKey);
      const allLogs = logs ? JSON.parse(logs) : {};
      const chatLogs = allLogs[chatId] || { chatId, summary: "", entries: [] };

      // Check if this exact content already exists in recent logs (last 10)
      const recentLogs = chatLogs.entries;
      const isDuplicate = recentLogs.some(
        (existingLog) =>
          existingLog.content === log.content && existingLog.type === log.type
      );

      if (!isDuplicate) {
        chatLogs.entries.push({
          id: `entry_${Date.now()}`,
          text: log.content,
          type: log.type,
          metadata: log.metadata,
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
