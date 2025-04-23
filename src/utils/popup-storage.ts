export class PopupStorage {
  private static instance: PopupStorage;

  private constructor() {}

  static getInstance(): PopupStorage {
    if (!PopupStorage.instance) {
      PopupStorage.instance = new PopupStorage();
    }
    return PopupStorage.instance;
  }

  get(key: string): Promise<any> {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get(key, (result) => {
          resolve(result[key]);
        });
      } else {
        resolve(null);
      }
    });
  }

  set(key: string, value: any): Promise<void> {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({ [key]: value }, () => {
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
} 