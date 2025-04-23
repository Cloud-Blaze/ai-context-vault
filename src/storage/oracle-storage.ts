import { OracleLog } from '../features/god-mode/oracle-tracker/parser';
import { StorageInterface, ChromeStorage } from './storage-interface';

interface StorageConfig {
  local: {
    maxSize: number;
    compression: boolean;
  };
  gist: {
    enabled: boolean;
    updateInterval: number;
    maxSize: number;
  };
}

export class OracleStorage {
  private static instance: OracleStorage;
  private config: StorageConfig;
  private queue: OracleLog[];
  private isSyncing: boolean;
  private syncTimeout: number | null;
  private storage: StorageInterface;

  private constructor() {
    this.config = this.loadConfig();
    this.queue = [];
    this.isSyncing = false;
    this.syncTimeout = null;
    this.storage = new ChromeStorage();
  }

  static getInstance(): OracleStorage {
    if (!OracleStorage.instance) {
      OracleStorage.instance = new OracleStorage();
    }
    return OracleStorage.instance;
  }

  private loadConfig(): StorageConfig {
    return {
      local: {
        maxSize: 10 * 1024 * 1024, // 10MB
        compression: true,
      },
      gist: {
        enabled: false,
        updateInterval: 5 * 60 * 1000, // 5 minutes
        maxSize: 1 * 1024 * 1024, // 1MB
      },
    };
  }

  async saveLog(log: OracleLog): Promise<void> {
    this.queue.push(log);
    await this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      await this.saveToLocal();

      if (this.config.gist.enabled) {
        if (this.syncTimeout) {
          clearTimeout(this.syncTimeout);
        }
        this.syncTimeout = setTimeout(() => this.syncToGist(), this.config.gist.updateInterval);
      }
    } finally {
      this.isSyncing = false;
    }
  }

  private async saveToLocal(): Promise<void> {
    const logs = await this.getLocalLogs();
    logs.push(...this.queue);

    const processedLogs = this.processLogs(logs);
    await this.storage.set('oracle_logs', processedLogs);
    this.queue = [];
  }

  private processLogs(logs: OracleLog[]): OracleLog[] {
    // Sort by timestamp
    logs.sort((a, b) => a.timestamp - b.timestamp);

    // Apply size limits
    if (this.config.local.compression) {
      // Implement compression logic here
      // For now, just limit the number of logs
      const maxLogs = Math.floor(this.config.local.maxSize / 1024); // Rough estimate
      return logs.slice(-maxLogs);
    }

    return logs;
  }

  private async getLocalLogs(): Promise<OracleLog[]> {
    const logs = await this.storage.get('oracle_logs');
    return logs || [];
  }

  private async syncToGist(): Promise<void> {
    if (!this.config.gist.enabled) return;

    const logs = this.queue;
    if (logs.length === 0) return;

    try {
      const gistData = this.prepareGistData(logs);
      await this.updateGist(gistData);
    } catch (error) {
      console.error('Failed to sync to Gist:', error);
    }
  }

  private prepareGistData(logs: OracleLog[]): string {
    return JSON.stringify(logs, null, 2);
  }

  private async updateGist(data: string): Promise<void> {
    // Implement Gist update logic here
    // This would require GitHub API integration
    console.log('Gist update would happen here with data:', data);
  }

  async getFullContext(chatId: string): Promise<OracleLog[]> {
    const logs = await this.getLocalLogs();
    return logs.filter(log => log.metadata.chatId === chatId);
  }

  async clearLogs(): Promise<void> {
    await this.storage.remove('oracle_logs');
    this.queue = [];
  }
} 