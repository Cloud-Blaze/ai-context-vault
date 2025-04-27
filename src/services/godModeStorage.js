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

  async getLogs() {
    try {
      const isGodModeEnabled = await this.checkEnabledState();
      if (!isGodModeEnabled) {
        return [];
      }

      const logs = localStorage.getItem(this.storageKey);
      return logs ? JSON.parse(logs) : [];
    } catch (error) {
      console.error("Error getting logs:", error);
      return [];
    }
  }

  async addLog(log) {
    try {
      const isGodModeEnabled = await this.checkEnabledState();
      if (!isGodModeEnabled) {
        return;
      }

      const logs = await this.getLogs();

      // Check if this exact content already exists in recent logs (last 10)
      const recentLogs = logs.slice(-10);
      const isDuplicate = recentLogs.some(
        (existingLog) =>
          existingLog.content === log.content && existingLog.type === log.type
      );

      if (!isDuplicate) {
        logs.push({
          ...log,
          id: crypto.randomUUID(),
          timestamp: Date.now(),
        });
        localStorage.setItem(this.storageKey, JSON.stringify(logs));
      }
    } catch (error) {
      console.error("Error adding log:", error);
    }
  }

  async clearLogs() {
    try {
      const isGodModeEnabled = await this.checkEnabledState();
      if (!isGodModeEnabled) {
        return;
      }

      localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.error("Error clearing logs:", error);
    }
  }
}

export { GodModeStorage };
