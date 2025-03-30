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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "OPEN_OPTIONS_PAGE") {
    chrome.runtime.openOptionsPage();
    sendResponse({ status: "options opened" });
  }
});

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL("options.html") });
});

////////////////////////////////////////////////////////////////////////////////
// GITHUB SYNC & FIRST INSTALL SUPPORT - ADDED AT BOTTOM
////////////////////////////////////////////////////////////////////////////////

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    console.log("[AI Context Vault] First install - opening options page...");
    chrome.windows.create({
      url: chrome.runtime.getURL("options.html"),
      type: "popup",
      width: 800,
      height: 600,
    });
  }
});
