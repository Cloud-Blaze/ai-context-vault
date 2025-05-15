/// <reference types="chrome"/>

export class PaymentManager {
  private static readonly STORAGE_KEY = 'hasPaid';

  static async checkPaymentStatus(): Promise<boolean> {
    return new Promise((resolve) => {
      chrome.storage.local.get([this.STORAGE_KEY], (result) => {
        resolve(!!result[this.STORAGE_KEY]);
      });
    });
  }

  static async initializePayment(): Promise<boolean> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'PURCHASE' }, (response) => {
        if (response && response.success) {
          chrome.storage.local.set({ [this.STORAGE_KEY]: true }, () => {
            resolve(true);
          });
        } else {
          resolve(false);
        }
      });
    });
  }

  static async validateLicense(): Promise<boolean> {
    return this.checkPaymentStatus();
  }

  static async handlePurchaseComplete(): Promise<void> {
    await chrome.storage.local.set({ [this.STORAGE_KEY]: true });
  }
} 