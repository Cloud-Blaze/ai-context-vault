import { GodModeStorage } from "./godModeStorage.js";
import { getAdapterForPlatform } from "../platforms/adapters.js";

const debounce = (fn, delay) => {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
};

export class GodModeObserver {
  static instance = null;
  static storage = GodModeStorage.getInstance();

  static getInstance() {
    if (!GodModeObserver.instance) {
      GodModeObserver.instance = new GodModeObserver();
    }
    return GodModeObserver.instance;
  }

  constructor() {
    this.observer = new MutationObserver(this.handleMutation.bind(this));
    this.interval = null;
    this.isEnabled = false;
    this.adapter = null;
    this.checkEnabledState = this.checkEnabledState.bind(this);
  }

  async checkEnabledState() {
    return new Promise((resolve) => {
      chrome.storage.local.get(["godModeEnabled"], (result) => {
        resolve(!!result.godModeEnabled);
      });
    });
  }

  async start() {
    if (this.isEnabled) return;

    const isGodModeEnabled = await this.checkEnabledState();
    if (!isGodModeEnabled) {
      console.log("[AI Context Vault] God Mode is not enabled");
      return;
    }

    this.isEnabled = true;

    try {
      this.adapter = getAdapterForPlatform();
    } catch (error) {
      console.error(
        "[AI Context Vault] Failed to get platform adapter:",
        error
      );
      return;
    }

    // Start mutation observer
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    // Start interval for periodic checks
    this.interval = setInterval(() => {
      this.checkForNewContent();
    }, 10000); // Check every 10 seconds

    console.log("[AI Context Vault] God Mode Observer started");
  }

  stop() {
    if (!this.isEnabled) return;
    this.isEnabled = false;

    this.observer.disconnect();
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    console.log("[AI Context Vault] God Mode Observer stopped");
  }

  async handleMutation(mutations) {
    if (!this.isEnabled || !this.adapter) return;

    const isGodModeEnabled = await this.checkEnabledState();
    if (!isGodModeEnabled) {
      this.stop();
      return;
    }

    const { domain, chatId } = this.parseUrlForIds(window.location.href);
    if (!chatId) return;
    for (const mutation of mutations) {
      const addedNodes = Array.from(mutation.addedNodes);
      for (const node of addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const containers = this.adapter.identifyMessageContainers(node);
          for (const container of containers) {
            const content = this.adapter.extractMessageContent(container);
            console.trace(content, "content");
            if (content) {
              const metadata = this.adapter.getMessageMetadata(container);
              await GodModeObserver.storage.addLog({
                chatId,
                type: metadata.role === "user" ? "input" : "output",
                content,
                metadata,
              });
            }
          }
        }
      }
    }
  }

  async checkForNewContent() {
    if (!this.isEnabled || !this.adapter) return;

    const isGodModeEnabled = await this.checkEnabledState();
    if (!isGodModeEnabled) {
      this.stop();
      return;
    }

    const { domain, chatId } = this.parseUrlForIds(window.location.href);
    if (!chatId) return;

    const containers = this.adapter.identifyMessageContainers(document.body);
    for (const container of containers) {
      const content = this.adapter.extractMessageContent(container);
      if (content) {
        const metadata = this.adapter.getMessageMetadata(container);
        await GodModeObserver.storage.addLog({
          chatId,
          type: metadata.role === "user" ? "input" : "output",
          content,
          metadata,
        });
      }
    }
  }

  parseUrlForIds(url) {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split("/");
      const chatId = pathParts[pathParts.length - 1] || "";
      return {
        domain: urlObj.hostname,
        chatId,
      };
    } catch (e) {
      return { domain: "", chatId: "" };
    }
  }
}
