// background.js
// Handles extension-level events, hotkeys, and messages to content scripts

chrome.commands.onCommand.addListener(async (command) => {
  console.log("[AI Context Vault] Command received:", command);

  if (command === "save-selected-context") {
    // Broadcast message to content script to save the user's selection
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: "SAVE_SELECTED_CONTEXT",
        });
      }
    });
  } else if (command === "show-context-manager") {
    console.log("[AI Context Vault] Toggling overlay...");
    // Toggle the overlay UI
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: "TOGGLE_OVERLAY",
        });
      }
    });
  }
});

// Listen for any additional messages from content scripts if needed:
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "LOG") {
    console.log("[AI Context Vault BG]", message.payload);
  }
  sendResponse({ status: "ok" });
});
