// inject.js
// Content script that modifies the AI chat "send" behavior to prepend stored context.

import { parseUrlForIds, getContext } from "../storage/contextStorage";

function prependContextIntoPrompt(originalPrompt) {
  const { domain, chatId } = parseUrlForIds(window.location.href);
  const ctx = getContext(domain, chatId);

  if (!ctx || ctx.entries.length === 0) {
    return originalPrompt; // no context
  }

  let combined = "";
  if (ctx.summary) {
    combined += ctx.summary.trim() + "\n\n";
  }

  const activeEntries = ctx.entries.filter((e) => e.active);
  activeEntries.forEach((entry) => {
    combined += `• ${entry.text}\n`;
  });

  if (activeEntries.length > 0) {
    combined += "\n"; // spacing
  }

  // Add user prompt
  combined += originalPrompt;
  return combined;
}

// Example: override send button for ChatGPT (other tools if you detect them similarly)
function interceptSendButton() {
  const chatgptSendBtn =
    document.querySelector("button[class*='bottom']") ||
    document.querySelector("button[aria-label='Send message']");
  const chatgptTextarea = document.querySelector("textarea");

  if (!chatgptSendBtn || !chatgptTextarea) return;

  chatgptSendBtn.addEventListener("click", () => {
    // Intercept the user's typed text
    const userText = chatgptTextarea.value.trim();
    if (!userText) return;

    // Prepend context
    const finalText = prependContextIntoPrompt(userText);

    // Place final text back into the textarea before letting ChatGPT do its send
    chatgptTextarea.value = finalText;
  });
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  interceptSendButton();
  setupKeyboardShortcuts();
});

// Additional direct keyboard shortcuts
function setupKeyboardShortcuts() {
  console.log("[AI Context Vault] Setting up direct keyboard shortcuts");

  document.addEventListener("keydown", (event) => {
    // Check for CMD+J (Mac) or CTRL+J (Windows/Linux)
    if ((event.metaKey || event.ctrlKey) && event.key === "j") {
      console.log(
        "[AI Context Vault] Direct keyboard shortcut: CMD/CTRL+J detected"
      );
      event.preventDefault(); // Prevent browser's default action

      const panel = document.getElementById("__ai_context_overlay__");
      if (panel) {
        panel.style.display = panel.style.display === "none" ? "block" : "none";
        console.log(
          "[AI Context Vault] Toggled overlay to:",
          panel.style.display
        );
      } else {
        console.log(
          "[AI Context Vault] Direct toggle failed: Overlay panel not found"
        );
      }
    }
  });
}

// Listen for background messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[AI Context Vault] Message received:", message);

  if (message.type === "SAVE_SELECTED_CONTEXT") {
    handleSaveSelectedContext();
  }
  if (message.type === "TOGGLE_OVERLAY") {
    console.log("[AI Context Vault] Toggling overlay visibility");
    const panel = document.getElementById("__ai_context_overlay__");
    if (panel) {
      panel.style.display = panel.style.display === "none" ? "block" : "none";
      console.log("[AI Context Vault] Overlay is now:", panel.style.display);
    } else {
      console.log("[AI Context Vault] Overlay panel not found!");
    }
  }
  sendResponse && sendResponse({ status: "ok" });
});

function handleSaveSelectedContext() {
  const selection = window.getSelection().toString().trim();
  if (selection) {
    const { domain, chatId } = parseUrlForIds(window.location.href);
    import("../storage/contextStorage").then((storage) => {
      storage.addContext(domain, chatId, selection);
      showConfirmationBubble(selection);

      // Trigger a custom event to notify the overlay to refresh
      const event = new CustomEvent("ai-context-updated", {
        detail: { domain, chatId },
      });
      document.dispatchEvent(event);
    });
  } else {
    console.log("No text selected to save.");
  }
}

// A simple confirmation bubble
function showConfirmationBubble(text) {
  const bubble = document.createElement("div");
  bubble.innerText = `Added to Context: "${text.substring(0, 30)}..."`;
  Object.assign(bubble.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    padding: "10px",
    background: "#1e1e1e",
    color: "#e0e0e0",
    border: "2px solid #444",
    borderRadius: "6px",
    zIndex: 999999,
    boxShadow: "0 2px 10px rgba(0, 0, 0, 0.3)",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    fontSize: "14px",
  });
  document.body.appendChild(bubble);
  setTimeout(() => bubble.remove(), 3000);
}
