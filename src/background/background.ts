/// <reference types="chrome"/>

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install") {
    chrome.storage.local.get(["installDate"], (result) => {
      if (!result.installDate) {
        chrome.storage.local.set({ installDate: Date.now() });
      }
    });
  }
}); 