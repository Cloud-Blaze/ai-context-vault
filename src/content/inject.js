// inject.js
// Content script that provides keyboard shortcut to inject context into AI chat messages.

import { parseUrlForIds, getContext } from "../storage/contextStorage";

/*
 * AI Context Vault Keyboard Shortcuts
 * ----------------------------------
 * CMD+J (Mac) or CTRL+J (Windows/Linux): Toggle context overlay
 * CMD+I (Mac) or CTRL+I (Windows/Linux): Save selected text to context
 * CMD+ENTER (Mac) or CTRL+ENTER (Windows/Linux): Inject context into message box (without sending)
 * CMD+SHIFT+\ (Mac) or CTRL+SHIFT+\ (Windows/Linux): Inject context and automatically send message
 *
 * Line endings are preserved when injecting context, with two blank lines added
 * between your context and your message for better readability.
 */

// Function to format our context for insertion into the message
function formatContextForPrompt(context) {
  if (!context || !context.entries || context.entries.length === 0) {
    return null; // No context to add
  }

  let formattedContext = "";

  // Add summary if available
  if (context.summary) {
    formattedContext += context.summary.trim() + "\n\n";
  }

  // Add active entries
  const activeEntries = context.entries.filter((e) => e.active);
  activeEntries.forEach((entry) => {
    formattedContext += `• ${entry.text}\n`;
  });

  // Add spacing if we have any context
  if (activeEntries.length > 0) {
    formattedContext += "\n";
  }

  return formattedContext || null;
}

// Run initialization immediately as the script loads
(function immediateInitialize() {
  console.log("[AI Context Vault] Immediate initialization...");
  setupKeyboardShortcuts();
  console.log("[AI Context Vault] Initialization complete");
})();

// Set up keyboard shortcuts for context injection
function setupKeyboardShortcuts() {
  console.log("[AI Context Vault] Setting up keyboard shortcuts");

  // Main keyboard event listener
  document.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "j") {
      console.log(
        "[AI Context Vault] Direct keyboard shortcut: CMD/CTRL+J detected"
      );
      event.preventDefault(); // Prevent browser's default action

      const panel = document.getElementById("__ai_context_overlay__");
      if (panel) {
        // If panel is already visible, trigger a context refresh before toggling
        if (panel.style.display !== "none") {
          // Trigger context refresh event
          const { domain, chatId } = parseUrlForIds(window.location.href);
          const refreshEvent = new CustomEvent("ai-context-refresh-requested", {
            detail: { domain, chatId, forceRefresh: true },
          });
          document.dispatchEvent(refreshEvent);
          console.log("[AI Context Vault] Requested context refresh");
        }

        // Toggle visibility
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

    // CTRL+SHIFT+\ (Windows/Linux) or CMD+SHIFT+\ (Mac) to inject context AND send
    if (
      (event.ctrlKey || event.metaKey) &&
      event.shiftKey &&
      event.key === "\\"
    ) {
      console.log(
        "[AI Context Vault] Modifier+SHIFT+\\ detected - injecting context and sending"
      );
      event.preventDefault(); // Prevent default action
      injectContextAndSendMessage();
    }

    // We'll keep the old shortcut as a way to just inject without sending
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      console.log(
        "[AI Context Vault] Modifier+ENTER detected - injecting context without sending"
      );
      event.preventDefault();
      injectContextIntoTextarea(false); // Don't send after injection
    }

    // CMD+J (Mac) or CTRL+J (Windows/Linux) to toggle overlay
    if ((event.metaKey || event.ctrlKey) && event.key === "j") {
      console.log("[AI Context Vault] Toggle overlay shortcut detected");
      event.preventDefault(); // Prevent browser's default action
      toggleOverlay();
    }
  });
}

// Inject context and send the message
function injectContextAndSendMessage() {
  injectContextIntoTextarea(true);
}

// Find the active textarea in ChatGPT interface
function findActiveTextarea() {
  // Common selectors for finding the textarea in different AI chat interfaces
  const possibleSelectors = [
    "textarea[data-id='root']", // ChatGPT
    "textarea.chat-input", // Common class
    "div[contenteditable='true']", // Some interfaces use contenteditable divs
    "textarea", // Generic fallback
  ];

  // Try each selector until we find a match
  for (const selector of possibleSelectors) {
    const elements = document.querySelectorAll(selector);
    for (const element of elements) {
      // Look for visible elements that are likely to be the chat input
      if (
        element.offsetParent !== null &&
        !element.disabled &&
        !element.readOnly
      ) {
        return element;
      }
    }
  }

  console.log("[AI Context Vault] No active textarea found");
  return null;
}

// Inject context into the active textarea
function injectContextIntoTextarea(shouldSendAfterInjection = false) {
  const textarea = findActiveTextarea();
  if (!textarea) {
    showConfirmationBubble("Could not find input area", "error");
    return;
  }

  // Get the current content
  let currentContent = "";
  if (textarea.tagName.toLowerCase() === "div") {
    // Handle contenteditable div
    currentContent = textarea.innerText;
  } else {
    // Handle standard textarea
    currentContent = textarea.value;
  }

  // Get the context for the current domain/chat
  const { domain, chatId } = parseUrlForIds(window.location.href);
  const contextData = getContext(domain, chatId);
  const formattedContext = formatContextForPrompt(contextData);

  // If no context to add, show a message and return
  if (!formattedContext) {
    showConfirmationBubble("No context available to inject", "warning");
    return;
  }

  // Ensure newlines are preserved by using explicit newline characters
  // Add two blank lines between context and user message for better separation
  const newContent = formattedContext + "\n\n" + currentContent;

  // Update the textarea content
  if (textarea.tagName.toLowerCase() === "div") {
    // Handle contenteditable div - use innerHTML with <br> tags for better line break preservation
    // First convert newlines to <br> tags
    const htmlContent = newContent.replace(/\n/g, "<br>");
    textarea.innerHTML = htmlContent;
    // Also dispatch input event to ensure UI updates
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  } else {
    // Handle standard textarea
    textarea.value = newContent;
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  }

  // Make sure the cursor is at the end
  textarea.focus();

  // If we should send the message after injection
  if (shouldSendAfterInjection) {
    // Show sending confirmation
    showConfirmationBubble(
      "Injecting context and sending message...",
      "success"
    );

    // Small delay to make sure the UI has updated with the new content
    setTimeout(() => {
      // Simulate pressing Enter to send the message
      const enterEvent = new KeyboardEvent("keydown", {
        key: "Enter",
        code: "Enter",
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true,
      });
      textarea.dispatchEvent(enterEvent);

      // Try clicking the send button as a backup
      tryClickingSendButton();
    }, 100);
  } else {
    // Just show the normal confirmation for injection without sending
    showConfirmationBubble("Context injected! Press ENTER to send", "success");
  }
}

// Try to find and click the send button (as a backup method)
function tryClickingSendButton() {
  // Common selectors for send buttons
  const sendButtonSelectors = [
    "button[data-testid='send-button']",
    "button.send-button",
    "button[aria-label='Send message']",
    "button.ChatMessageInputFooter__SendIcon",
    // ChatGPT's send button often has multiple classes so we use partial matching
    "button[class*='bottom']",
  ];

  // Try each selector
  for (const selector of sendButtonSelectors) {
    const buttons = document.querySelectorAll(selector);
    for (const button of buttons) {
      if (button && button.offsetParent !== null && !button.disabled) {
        // Found a visible, enabled button - click it
        console.log("[AI Context Vault] Found send button, clicking it");
        button.click();
        return true;
      }
    }
  }

  console.log("[AI Context Vault] Could not find send button to click");
  return false;
}

// Toggle the context overlay visibility
function toggleOverlay() {
  const panel = document.getElementById("__ai_context_overlay__");
  if (panel) {
    // If panel is already visible, trigger a context refresh before toggling
    if (panel.style.display !== "none") {
      // Trigger context refresh event
      const { domain, chatId } = parseUrlForIds(window.location.href);
      const refreshEvent = new CustomEvent("ai-context-refresh-requested", {
        detail: { domain, chatId, forceRefresh: true },
      });
      document.dispatchEvent(refreshEvent);
      console.log("[AI Context Vault] Requested context refresh");
    }

    // Toggle visibility
    panel.style.display = panel.style.display === "none" ? "block" : "none";
    console.log("[AI Context Vault] Toggled overlay to:", panel.style.display);
  } else {
    console.log(
      "[AI Context Vault] Direct toggle failed: Overlay panel not found"
    );
  }
}

// Listen for background messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[AI Context Vault] Message received:", message);

  if (message.type === "SAVE_SELECTED_CONTEXT") {
    handleSaveSelectedContext();
  }
  if (message.type === "TOGGLE_OVERLAY") {
    console.log("[AI Context Vault] Toggling overlay visibility");
    toggleOverlay();
  }
  sendResponse && sendResponse({ status: "ok" });
});

function handleSaveSelectedContext() {
  const selection = window.getSelection().toString().trim();
  if (selection) {
    const { domain, chatId } = parseUrlForIds(window.location.href);
    import("../storage/contextStorage").then((storage) => {
      storage.addContext(domain, chatId, selection);
      showConfirmationBubble(
        "Added to Context: " + selection.substring(0, 30) + "...",
        "success"
      );

      // Trigger a custom event to notify the overlay to refresh
      const event = new CustomEvent("ai-context-updated", {
        detail: { domain, chatId },
      });
      document.dispatchEvent(event);
    });
  } else {
    console.log("No text selected to save.");
    showConfirmationBubble("No text selected to save", "warning");
  }
}

// An enhanced confirmation bubble with different types (success, warning, error)
function showConfirmationBubble(text, type = "success") {
  const bubble = document.createElement("div");
  bubble.innerText = text;

  // Common styles
  const styles = {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    padding: "12px 16px",
    borderRadius: "8px",
    zIndex: 999999,
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    fontSize: "14px",
    maxWidth: "300px",
    transition: "all 0.3s ease",
  };

  // Type-specific styles
  const typeStyles = {
    success: {
      background: "#1a1a1a",
      color: "#4ade80",
      border: "1px solid #4ade80",
    },
    warning: {
      background: "#1a1a1a",
      color: "#facc15",
      border: "1px solid #facc15",
    },
    error: {
      background: "#1a1a1a",
      color: "#f87171",
      border: "1px solid #f87171",
    },
  };

  // Apply styles
  Object.assign(bubble.style, styles, typeStyles[type] || typeStyles.success);

  // Add bubble to the page
  document.body.appendChild(bubble);

  // Animation
  setTimeout(() => {
    bubble.style.opacity = "1";
  }, 10);

  // Remove after delay
  setTimeout(() => {
    bubble.style.opacity = "0";
    bubble.style.transform = "translateY(10px)";
    setTimeout(() => bubble.remove(), 300);
  }, 3000);
}
