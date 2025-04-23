export interface Message {
  action: string;
  [key: string]: any;
}

export interface MessageHandler {
  (message: Message, sender: any, sendResponse: (response?: any) => void): boolean | void;
}

export class Messaging {
  private static instance: Messaging;
  private handlers: Map<string, MessageHandler>;

  private constructor() {
    this.handlers = new Map();
  }

  static getInstance(): Messaging {
    if (!Messaging.instance) {
      Messaging.instance = new Messaging();
    }
    return Messaging.instance;
  }

  addListener(handler: MessageHandler): void {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.onMessage.addListener(handler);
    }
  }

  sendMessage(message: Message): Promise<any> {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage(message, resolve);
      } else {
        resolve(null);
      }
    });
  }
} 