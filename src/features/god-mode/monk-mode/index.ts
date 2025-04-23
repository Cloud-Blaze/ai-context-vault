import { OracleParser } from '../oracle-tracker/parser';
import { OracleStorage } from '../../../storage/oracle-storage';

export class MonkMode {
  private static instance: MonkMode;
  private isEnabled: boolean;
  private parser: OracleParser;
  private storage: OracleStorage;
  private viewer: HTMLElement | null;

  private constructor() {
    this.isEnabled = false;
    this.parser = OracleParser.getInstance();
    this.storage = OracleStorage.getInstance();
    this.viewer = null;
  }

  static getInstance(): MonkMode {
    if (!MonkMode.instance) {
      MonkMode.instance = new MonkMode();
    }
    return MonkMode.instance;
  }

  async enable(): Promise<void> {
    if (this.isEnabled) return;
    this.isEnabled = true;
    await this.initializeTracking();
    this.initializeKeyboardShortcuts();
  }

  async disable(): Promise<void> {
    if (!this.isEnabled) return;
    this.isEnabled = false;
    this.removeViewer();
  }

  private async initializeTracking(): Promise<void> {
    const containers = document.querySelectorAll('.chat-container, .conversation-container');
    containers.forEach(container => {
      this.parser.startTracking(container as HTMLElement);
    });

    // Watch for new chat containers
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node instanceof HTMLElement) {
            const containers = node.querySelectorAll('.chat-container, .conversation-container');
            containers.forEach(container => {
              this.parser.startTracking(container as HTMLElement);
            });
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  private initializeKeyboardShortcuts(): void {
    document.addEventListener('keydown', this.handleShortcut.bind(this));
  }

  private handleShortcut(event: KeyboardEvent): void {
    if (event.key === 'g' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      this.toggleViewer();
    }
  }

  private async toggleViewer(): Promise<void> {
    if (this.viewer) {
      this.removeViewer();
    } else {
      await this.showViewer();
    }
  }

  private async showViewer(): Promise<void> {
    const viewer = document.createElement('div');
    viewer.id = 'oracle-viewer';
    viewer.style.cssText = `
      position: fixed;
      top: 0;
      right: 0;
      width: 400px;
      height: 100vh;
      background: white;
      box-shadow: -2px 0 5px rgba(0,0,0,0.1);
      z-index: 9999;
      padding: 20px;
      overflow-y: auto;
    `;

    const chatId = this.getCurrentChatId();
    const logs = await this.storage.getFullContext(chatId);

    viewer.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h2 style="margin: 0;">Oracle Viewer</h2>
        <button id="close-viewer" style="padding: 5px 10px;">Close</button>
      </div>
      <div id="log-container">
        ${logs.map(log => this.formatLog(log)).join('')}
      </div>
    `;

    document.body.appendChild(viewer);
    this.viewer = viewer;

    const closeButton = viewer.querySelector('#close-viewer');
    if (closeButton) {
      closeButton.addEventListener('click', () => this.removeViewer());
    }
  }

  private removeViewer(): void {
    if (this.viewer) {
      this.viewer.remove();
      this.viewer = null;
    }
  }

  private formatLog(log: any): string {
    const date = new Date(log.timestamp);
    return `
      <div style="margin-bottom: 15px; padding: 10px; border: 1px solid #eee; border-radius: 4px;">
        <div style="font-size: 12px; color: #666; margin-bottom: 5px;">
          ${date.toLocaleString()} - ${log.type}
        </div>
        <div style="white-space: pre-wrap;">${log.content}</div>
      </div>
    `;
  }

  private getCurrentChatId(): string {
    const url = new URL(window.location.href);
    return url.searchParams.get('chatId') || 'default';
  }
} 