/// <reference types="chrome"/>

export class AdConsentManager {
  private static readonly STORAGE_KEY = 'hasAdConsent';

  static async toggleAdConsent(): Promise<boolean> {
    return new Promise((resolve) => {
      chrome.storage.local.get([this.STORAGE_KEY], (result) => {
        const newStatus = !result[this.STORAGE_KEY];
        chrome.storage.local.set({ [this.STORAGE_KEY]: newStatus }, () => {
          if (newStatus) {
            this.initializeTracking();
          }
          resolve(newStatus);
        });
      });
    });
  }

  static async checkConsentStatus(): Promise<boolean> {
    return new Promise((resolve) => {
      chrome.storage.local.get([this.STORAGE_KEY], (result) => {
        resolve(!!result[this.STORAGE_KEY]);
      });
    });
  }

  private static initializeTracking() {
    // Initialize any ad tracking services here
    // This is where you would integrate with your ad network
    console.log('Ad tracking initialized');
  }
} 