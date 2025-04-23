import { MonkMode } from './monk-mode';
import { OracleStorage } from '../../storage/oracle-storage';
import { Messaging, Message } from '../../utils/messaging';

export class GodMode {
  private static instance: GodMode;
  private monkMode: MonkMode;
  private storage: OracleStorage;
  private messaging: Messaging;
  private isEnabled: boolean;

  private constructor() {
    this.monkMode = MonkMode.getInstance();
    this.storage = OracleStorage.getInstance();
    this.messaging = Messaging.getInstance();
    this.isEnabled = false;
  }

  static getInstance(): GodMode {
    if (!GodMode.instance) {
      GodMode.instance = new GodMode();
    }
    return GodMode.instance;
  }

  async enable(): Promise<void> {
    if (this.isEnabled) return;
    this.isEnabled = true;
    await this.monkMode.enable();
  }

  async disable(): Promise<void> {
    if (!this.isEnabled) return;
    this.isEnabled = false;
    await this.monkMode.disable();
  }

  async clearData(): Promise<void> {
    await this.storage.clearLogs();
  }

  isActive(): boolean {
    return this.isEnabled;
  }

  initializeMessaging(): void {
    this.messaging.addListener((request: Message, sender, sendResponse) => {
      if (request.action === 'toggleGodMode') {
        if (request.enabled) {
          this.enable().then(() => sendResponse({ success: true }));
        } else {
          this.disable().then(() => sendResponse({ success: true }));
        }
        return true;
      }
    });
  }
}

// Initialize God Mode when the script loads
const godMode = GodMode.getInstance();
godMode.initializeMessaging(); 