import { Messaging } from './utils/messaging';
import { PopupStorage } from './utils/popup-storage';

const messaging = Messaging.getInstance();
const storage = PopupStorage.getInstance();

// Listen for messages from content scripts and popup
messaging.addListener((message, sender, sendResponse) => {
  if (message.action === 'toggleGodMode') {
    // Update storage
    storage.set('godModeEnabled', message.enabled).then(() => {
      // Notify all tabs
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, message);
          }
        });
        sendResponse({ success: true });
      });
    });
    return true; // Keep the message channel open for async response
  } else if (message.action === 'clearData') {
    // Clear all stored data
    storage.set('oracle_logs', []).then(() => {
      storage.set('godModeEnabled', false).then(() => {
        // Notify all tabs
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach(tab => {
            if (tab.id) {
              chrome.tabs.sendMessage(tab.id, { action: 'clearData' });
            }
          });
          sendResponse({ success: true });
        });
      });
    });
    return true; // Keep the message channel open for async response
  }
  return false;
}); 