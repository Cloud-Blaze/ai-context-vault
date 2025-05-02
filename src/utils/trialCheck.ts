/// <reference types="chrome"/>

export interface TrialStatusInfo {
  isExpired: boolean;
  isUnlocked: boolean;
  daysRemaining: number;
}

export async function checkTrialStatus(): Promise<TrialStatusInfo> {
  return new Promise((resolve) => {
    chrome.storage.local.get(
      ["installDate", "hasPaid", "hasConsentedToAds"],
      (res) => {
        const now = Date.now();
        const installDate = res.installDate || now;
        const trialLength = 1000 * 60 * 60 * 24 * 30; // 30 days
        const isExpired = now - installDate > trialLength;
        const isUnlocked = res.hasPaid || res.hasConsentedToAds;
        const daysRemaining = Math.max(
          0,
          Math.floor(
            (trialLength - (now - installDate)) / (1000 * 60 * 60 * 24)
          )
        );

        resolve({ isExpired, isUnlocked, daysRemaining });
      }
    );
  });
} 