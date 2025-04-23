import { generateUniqueId } from 'src/utils/id';
import { htmlToMarkdown } from 'src/utils/markdown';

export interface OracleLog {
  id: string;
  timestamp: number;
  type: "input" | "output";
  content: string;
  metadata: {
    domain: string;
    chatId: string;
    contextWindow: number;
    messageId?: string;
    parentId?: string;
    role?: "user" | "assistant";
  };
  raw: {
    html: string;
    text: string;
    markdown: string;
  };
}

export class OracleParser {
  private static instance: OracleParser;
  private observers: Set<MutationObserver>;
  private textareaObserver: MutationObserver;

  private constructor() {
    this.observers = new Set();
    this.textareaObserver = new MutationObserver(this.handleTextareaChanges.bind(this));
  }

  static getInstance(): OracleParser {
    if (!OracleParser.instance) {
      OracleParser.instance = new OracleParser();
    }
    return OracleParser.instance;
  }

  startTracking(container: HTMLElement): void {
    const observer = new MutationObserver(this.handleChatChanges.bind(this));
    observer.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    this.observers.add(observer);

    // Start tracking textareas
    const textareas = container.querySelectorAll('textarea');
    textareas.forEach(textarea => {
      this.textareaObserver.observe(textarea, {
        characterData: true,
        childList: true,
        subtree: true,
      });
    });
  }

  private handleTextareaChanges(mutations: MutationRecord[]): void {
    for (const mutation of mutations) {
      if (mutation.target instanceof HTMLTextAreaElement) {
        this.parseInput(mutation.target);
      }
    }
  }

  private handleChatChanges(mutations: MutationRecord[]): void {
    for (const mutation of mutations) {
      if (this.isChatMessage(mutation.target)) {
        this.parseOutput(mutation.target as HTMLElement);
      }
    }
  }

  private isChatMessage(element: Node): boolean {
    if (!(element instanceof HTMLElement)) return false;
    return element.classList.contains('message') || 
           element.classList.contains('chat-message') ||
           element.getAttribute('role') === 'assistant';
  }

  parseInput(textarea: HTMLTextAreaElement): OracleLog {
    return {
      id: generateUniqueId(),
      timestamp: Date.now(),
      type: "input",
      content: textarea.value,
      metadata: this.extractMetadata(),
      raw: {
        html: textarea.outerHTML,
        text: textarea.value,
        markdown: htmlToMarkdown(textarea),
      },
    };
  }

  parseOutput(message: HTMLElement): OracleLog {
    return {
      id: generateUniqueId(),
      timestamp: Date.now(),
      type: "output",
      content: message.textContent || "",
      metadata: this.extractMetadata(),
      raw: {
        html: message.outerHTML,
        text: message.textContent || "",
        markdown: htmlToMarkdown(message),
      },
    };
  }

  private extractMetadata() {
    return {
      domain: window.location.hostname,
      chatId: this.getChatId(),
      contextWindow: this.getContextWindow(),
    };
  }

  private getChatId(): string {
    // Extract chat ID from URL or generate a new one
    const url = new URL(window.location.href);
    return url.searchParams.get('chatId') || generateUniqueId();
  }

  private getContextWindow(): number {
    // Get current context window size from the chat interface
    const contextWindow = document.querySelector('.context-window');
    return contextWindow ? parseInt(contextWindow.getAttribute('data-size') || '0') : 0;
  }
} 