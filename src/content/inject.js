// inject.js
// Content script that provides keyboard shortcut to inject context into AI chat messages,
// with a modified approach to prevent ChatGPT from intercepting CMD+ENTER/CTRL+ENTER.

import { parseUrlForIds, getContext } from "../storage/contextStorage";

/*
 * AI Context Vault Keyboard Shortcuts
 * ----------------------------------
 * ALT+SHIFT+I: Toggle context overlay
 * ALT+I: Save selected text to context
 * ALT+ENTER: Inject context into message box (without sending)
 * ALT+SHIFT+ENTER: Inject context and automatically send message
 *
 * Line endings are preserved when injecting context, with two blank lines added
 * between your context and your message for better readability.
 */

// Function to format timestamp in DD/MM HH:mm format
function formatTimestamp(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${month}/${day} ${hours}:${minutes}:${seconds}`;
}

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
    const timestamp = formatTimestamp(entry.lastModified || entry.created);
    formattedContext += `• [${timestamp}] ${entry.text}\n`;
  });

  // Add spacing if we have any context
  if (activeEntries.length > 0) {
    formattedContext += "\n";
  }

  return formattedContext || null;
}

// Run initialization immediately as the script loads
(async function immediateInitialize() {
  console.log("[AI Context Vault] Immediate initialization...");
  setupKeyboardShortcuts();

  // Ensure the overlay element exists in the DOM
  await ensureOverlayExists();

  console.log("[AI Context Vault] Initialization complete");
})();

/**
 * Ensure that the context overlay exists in the DOM.
 * If it doesn't exist, create it. This is where we display the saved context items.
 */
async function ensureOverlayExists() {
  // Check if the overlay already exists
  let overlayPanel = document.getElementById("__ai_context_overlay__");

  // If overlay doesn't exist, create it
  if (!overlayPanel) {
    console.log("[AI Context Vault] Overlay not found in DOM, creating it...");

    // Create the overlay container
    overlayPanel = document.createElement("div");
    overlayPanel.id = "__ai_context_overlay__";

    // Set initial styles
    Object.assign(overlayPanel.style, {
      position: "fixed",
      top: "20px",
      right: "20px",
      width: "300px",
      maxHeight: "80vh",
      backgroundColor: "#1e1e1e",
      color: "#e0e0e0",
      border: "1px solid #444",
      borderRadius: "8px",
      padding: "15px",
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
      zIndex: "999999",
      overflow: "auto",
      display: "none", // Initially hidden
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      fontSize: "14px",
    });

    // Create the header
    const header = document.createElement("div");
    header.style.marginBottom = "10px";
    header.style.display = "flex";
    header.style.justifyContent = "space-between";
    header.style.alignItems = "center";

    const title = document.createElement("h3");
    title.textContent = "AI Context Vault";
    title.style.margin = "0";
    title.style.fontSize = "16px";
    title.style.fontWeight = "bold";

    const closeButton = document.createElement("button");
    closeButton.textContent = "×";
    closeButton.style.background = "none";
    closeButton.style.border = "none";
    closeButton.style.color = "#e0e0e0";
    closeButton.style.fontSize = "20px";
    closeButton.style.cursor = "pointer";
    closeButton.style.padding = "0";
    closeButton.style.lineHeight = "1";

    // Close button event listener
    closeButton.addEventListener("click", function () {
      overlayPanel.style.display = "none";
    });

    header.appendChild(title);
    header.appendChild(closeButton);

    // Create content container
    const content = document.createElement("div");
    content.id = "__ai_context_content__";

    // Add elements to the overlay
    overlayPanel.appendChild(header);
    overlayPanel.appendChild(content);

    // Add overlay to the DOM
    document.body.appendChild(overlayPanel);

    console.log("[AI Context Vault] Created overlay element and added to DOM");

    // Add event listener for the custom refresh event
    document.addEventListener(
      "ai-context-refresh-requested",
      async function (event) {
        await refreshOverlayContent(overlayPanel);
      }
    );

    // Add event listener for the context updated event
    document.addEventListener("ai-context-updated", async function (event) {
      await refreshOverlayContent(overlayPanel);
    });

    // Initial content population
    await refreshOverlayContent(overlayPanel);
  } else {
    console.log("[AI Context Vault] Overlay already exists in DOM");
  }

  return overlayPanel;
}

/**
 * Refresh the content of the overlay with current context data.
 */
async function refreshOverlayContent(overlayPanel) {
  const contentContainer = document.getElementById("__ai_context_content__");
  if (!contentContainer) {
    console.error("[AI Context Vault] Content container not found in overlay");
    return;
  }

  // Get current context
  const { domain, chatId } = parseUrlForIds(window.location.href);
  const contextData = await getContext(domain, chatId);

  // Clear existing content
  contentContainer.innerHTML = "";

  if (
    !contextData ||
    !contextData.entries ||
    contextData.entries.length === 0
  ) {
    // No context available
    const noContext = document.createElement("p");
    noContext.textContent =
      "No context available for this chat. Highlight text and press CMD+I/CTRL+I to add context.";
    noContext.style.color = "#999";
    contentContainer.appendChild(noContext);
  } else {
    // Add summary if available
    if (contextData.summary) {
      const summarySection = document.createElement("div");
      summarySection.style.marginBottom = "15px";

      const summaryTitle = document.createElement("h4");
      summaryTitle.textContent = "Summary";
      summaryTitle.style.margin = "0 0 5px 0";
      summaryTitle.style.fontSize = "14px";
      summaryTitle.style.fontWeight = "bold";
      summaryTitle.style.color = "#4ade80";

      const summaryText = document.createElement("p");
      summaryText.textContent = contextData.summary;
      summaryText.style.margin = "0";
      summaryText.style.lineHeight = "1.4";

      summarySection.appendChild(summaryTitle);
      summarySection.appendChild(summaryText);
      contentContainer.appendChild(summarySection);
    }

    // Add context entries
    if (contextData.entries.length > 0) {
      const entriesSection = document.createElement("div");

      const entriesTitle = document.createElement("h4");
      entriesTitle.textContent = "Context Items";
      entriesTitle.style.margin = "0 0 10px 0";
      entriesTitle.style.fontSize = "14px";
      entriesTitle.style.fontWeight = "bold";
      entriesTitle.style.color = "#4ade80";

      entriesSection.appendChild(entriesTitle);

      // Create list of entries
      contextData.entries.forEach((entry, index) => {
        const entryItem = document.createElement("div");
        entryItem.style.display = "flex";
        entryItem.style.alignItems = "flex-start";
        entryItem.style.marginBottom = "8px";
        entryItem.style.justifyContent = "space-between";
        entryItem.style.paddingBottom = "8px";
        entryItem.style.borderBottom = "1px solid #444";
        entryItem.style.transition = "all 0.3s ease";

        // Text content container
        const textContainer = document.createElement("div");
        textContainer.style.flex = "1";
        textContainer.style.marginRight = "8px";

        // Text content
        const text = document.createElement("div");
        text.textContent = entry.text;
        text.style.lineHeight = "1.4";
        text.style.wordBreak = "break-word";

        // Edit textarea (hidden by default)
        const editTextarea = document.createElement("textarea");
        editTextarea.value = entry.text;
        editTextarea.style.width = "100%";
        editTextarea.style.height = "600px";
        editTextarea.style.minHeight = "100px";
        editTextarea.style.maxHeight = "75vh";
        editTextarea.style.backgroundColor = "#2d2d2d";
        editTextarea.style.color = "#e0e0e0";
        editTextarea.style.border = "1px solid #444";
        editTextarea.style.borderRadius = "4px";
        editTextarea.style.padding = "8px";
        editTextarea.style.marginTop = "8px";
        editTextarea.style.display = "none";
        editTextarea.style.resize = "vertical";

        textContainer.appendChild(text);
        textContainer.appendChild(editTextarea);

        // Button container
        const buttonContainer = document.createElement("div");
        buttonContainer.style.display = "flex";
        buttonContainer.style.gap = "8px";
        buttonContainer.style.alignItems = "center";

        // Delete button
        const deleteButton = document.createElement("button");
        deleteButton.textContent = "×";
        deleteButton.style.background = "none";
        deleteButton.style.border = "none";
        deleteButton.style.color = "#f87171";
        deleteButton.style.fontSize = "18px";
        deleteButton.style.cursor = "pointer";
        deleteButton.style.padding = "0 4px";
        deleteButton.style.lineHeight = "1";
        deleteButton.style.opacity = "0.7";
        deleteButton.style.transition = "opacity 0.2s";

        // Edit/Save button
        const editButton = document.createElement("button");
        editButton.innerHTML = "✎"; // Pencil icon
        editButton.style.background = "none";
        editButton.style.border = "none";
        editButton.style.color = "#4ade80";
        editButton.style.fontSize = "18px";
        editButton.style.cursor = "pointer";
        editButton.style.padding = "0 4px";
        editButton.style.lineHeight = "1";
        editButton.style.opacity = "0.7";
        editButton.style.transition = "opacity 0.2s";

        // Hover effects
        [deleteButton, editButton].forEach((button) => {
          button.addEventListener("mouseover", () => {
            button.style.opacity = "1";
          });
          button.addEventListener("mouseout", () => {
            button.style.opacity = "0.7";
          });
        });

        // Edit button click handler
        editButton.addEventListener("click", async function () {
          const isEditing = editTextarea.style.display === "block";

          if (!isEditing) {
            // Start editing
            text.style.display = "none";
            editTextarea.style.display = "block";
            editButton.innerHTML = "✓"; // Save icon
            editButton.style.color = "#4ade80";

            // Hide other entries while editing
            const allEntries = entriesSection.querySelectorAll(
              "div[style*='margin-bottom: 8px']"
            );
            allEntries.forEach((e) => {
              if (e !== entryItem) {
                e.style.display = "none";
              }
            });

            // Focus the textarea
            editTextarea.focus();
          } else {
            // Save changes
            const newText = editTextarea.value.trim();
            if (newText && newText !== entry.text) {
              try {
                const storage = await import("../storage/contextStorage");
                await storage.updateContext(
                  domain,
                  chatId,
                  entry.text,
                  newText
                );

                // Update local entry
                entry.text = newText;
                text.textContent = newText;

                // Trigger refresh event
                const event = new CustomEvent("ai-context-updated", {
                  detail: { domain, chatId },
                });
                document.dispatchEvent(event);

                // Show success feedback
                showConfirmationBubble(
                  "Context updated successfully",
                  "success"
                );
              } catch (error) {
                console.error(
                  "[AI Context Vault] Error updating context:",
                  error
                );
                showConfirmationBubble("Failed to update context", "error");
              }
            }

            // Reset UI
            text.style.display = "block";
            editTextarea.style.display = "none";
            editButton.innerHTML = "✎"; // Back to pencil icon
            editButton.style.color = "#4ade80";

            // Show all entries again
            const allEntries = entriesSection.querySelectorAll(
              "div[style*='margin-bottom: 8px']"
            );
            allEntries.forEach((e) => {
              e.style.display = "flex";
            });
          }
        });

        // Delete button event listener
        deleteButton.addEventListener("click", function () {
          import("../storage/contextStorage").then(async (storage) => {
            await storage.deleteContext(domain, chatId, entry.text);
            // Trigger refresh of the overlay content
            refreshOverlayContent(overlayPanel);
          });
        });

        buttonContainer.appendChild(deleteButton);
        buttonContainer.appendChild(editButton);
        entryItem.appendChild(textContainer);
        entryItem.appendChild(buttonContainer);
        entriesSection.appendChild(entryItem);
      });

      contentContainer.appendChild(entriesSection);
    }
  }

  console.log("[AI Context Vault] Refreshed overlay content");
}

/**
 * Set up keyboard shortcuts. Note the special capturing approach for CMD+ENTER/CTRL+ENTER.
 */
function setupKeyboardShortcuts() {
  console.log("[AI Context Vault] Setting up keyboard shortcuts");

  // 1) Listen in *capturing phase* so we can intercept events before ChatGPT does.
  //    We pass `true` as the last argument for addEventListener.
  document.addEventListener(
    "keydown",
    (event) => {
      // ALT+I to save selected text
      if ((event.ctrlKey || event.metaKey) && event.key === "i") {
        console.log("[AI Context Vault] Modifier+I - save selected text");
        event.preventDefault();
        event.stopImmediatePropagation();
        handleSaveSelectedContext();
        return;
      }

      // ALT+SHIFT+ENTER to inject context AND send
      if (event.altKey && event.shiftKey && event.key === "Enter") {
        console.log(
          "[AI Context Vault] ALT+SHIFT+ENTER - inject context + send"
        );
        event.preventDefault();
        event.stopImmediatePropagation();
        injectContextIntoTextarea(true);
        return;
      }

      // ALT+ENTER: inject context into the message box *without* sending
      if (event.altKey && event.key === "Enter") {
        console.log(
          "[AI Context Vault] ALT+ENTER - injecting context (captured early)"
        );
        // This is the key fix: we stop the event so ChatGPT won't send the message.
        event.preventDefault();
        event.stopImmediatePropagation();

        // Insert context into the text area, but do *not* send
        injectContextIntoTextarea(false);
        return;
      }

      // ALT+SHIFT+I: Toggle overlay
      if ((event.metaKey || event.ctrlKey) && event.key === "j") {
        console.log("[AI Context Vault] Toggle overlay (CMD/CTRL+J)");
        event.preventDefault();
        event.stopImmediatePropagation();
        toggleOverlay();
      }
    },
    true // Capture phase
  );
}
/**
 * Toggle the context overlay visibility with a settings cog to open options.html.
 */
async function toggleOverlay() {
  const panel = await ensureOverlayExists();

  // Ensure settings cog is present
  let settingsCog = document.getElementById("__ai_context_settings_cog__");
  if (!settingsCog) {
    settingsCog = document.createElement("div");
    settingsCog.id = "__ai_context_settings_cog__";
    settingsCog.innerHTML = "&#9881;"; // ⚙️ gear unicode
    Object.assign(settingsCog.style, {
      position: "absolute",
      top: "11px",
      right: "41px",
      cursor: "pointer",
      fontSize: "26px",
      color: "#999",
      transition: "color 0.3s ease",
    });

    settingsCog.addEventListener("mouseover", () => {
      settingsCog.style.color = "#fff";
    });
    settingsCog.addEventListener("mouseout", () => {
      settingsCog.style.color = "#999";
    });

    settingsCog.addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "OPEN_OPTIONS_PAGE" });
    });

    panel.appendChild(settingsCog);
  }

  const currentDisplayStyle = window.getComputedStyle(panel).display;

  if (panel.style.display !== "none" && currentDisplayStyle !== "none") {
    const { domain, chatId } = parseUrlForIds(window.location.href);
    document.dispatchEvent(
      new CustomEvent("ai-context-refresh-requested", {
        detail: { domain, chatId, forceRefresh: true },
      })
    );
  }

  if (panel.style.display === "none" || currentDisplayStyle === "none") {
    panel.style.display = "block";
  } else {
    panel.style.display = "none";
  }
}

/**
 * Ensures a settings button (cog icon) is present in the overlay
 * that opens the extension's options page.
 */
function ensureSettingsButton(panel) {
  const existingButton = document.getElementById(
    "__ai_context_overlay_settings__"
  );
  if (!existingButton) {
    const settingsButton = document.createElement("button");
    settingsButton.id = "__ai_context_overlay_settings__";
    settingsButton.innerHTML = "⚙️";
    Object.assign(settingsButton.style, {
      position: "absolute",
      top: "10px",
      right: "40px",
      background: "none",
      border: "none",
      cursor: "pointer",
      fontSize: "18px",
      color: "#ccc",
      padding: "0",
      zIndex: "1000000",
    });

    settingsButton.addEventListener("click", () => {
      chrome.tabs.sendMessage({ type: "OPEN_OPTIONS_PAGE" });
    });

    panel.appendChild(settingsButton);
  }
}

/**
 * Find the active textarea in ChatGPT's interface or a generic text field if needed.
 */
function findActiveTextarea() {
  const possibleSelectors = [
    "textarea[data-id='root']", // ChatGPT
    "textarea.chat-input",
    "div[contenteditable='true']",
    "textarea", // fallback
  ];

  for (const selector of possibleSelectors) {
    const elements = document.querySelectorAll(selector);
    for (const element of elements) {
      if (
        element.offsetParent !== null &&
        !element.disabled &&
        !element.readOnly
      ) {
        console.log("[AI Context Vault] Found active input using:", selector);
        return element;
      }
    }
  }

  console.log("[AI Context Vault] No active textarea found");
  return null;
}

/**
 * Inject context into the active textarea. Optionally send the message.
 */
async function injectContextIntoTextarea(shouldSendAfterInjection = false) {
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
    // Standard textarea
    currentContent = textarea.value;
  }

  // Get context data
  const { domain, chatId } = parseUrlForIds(window.location.href);
  const contextData = await getContext(domain, chatId);
  const formattedContext = formatContextForPrompt(contextData);

  if (!formattedContext) {
    showConfirmationBubble("No context available to inject", "warning");
    return;
  }

  // Get current timestamp
  const currentTimestamp = formatTimestamp(Date.now());

  // Construct the new content
  const newContent =
    "‼️ CONTEXT PROTOCOL - HIGHEST PRIORITY:\n\n" +
    formattedContext +
    "\n\n📏EXECUTION PARAMETERS:\n- Full contextual compliance is a non-negotiable requirement\n\n- Deviation from established context is prohibited\n\n- Every response must be comprehensively informed by and aligned with this context\n\nCONTINUED INTERACTION:\n-Preserve and apply all previous contextual understanding\n-Integrate new input with existing knowledge\n-Respond comprehensively and contextually\n\n🆕NEW USER PROMPT ON " +
    currentTimestamp +
    ': \n"' +
    currentContent +
    '"';

  // Update the textarea
  if (textarea.tagName.toLowerCase() === "div") {
    // contenteditable div
    const htmlContent = newContent.replace(
      /\n/g,
      '<p><br class="ProseMirror-trailingBreak"></p>'
    );
    textarea.innerHTML = htmlContent;
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  } else {
    // standard textarea
    textarea.value = newContent;
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  }

  textarea.focus();

  if (shouldSendAfterInjection) {
    showConfirmationBubble(
      "Injecting context and sending message...",
      "success"
    );
    setTimeout(() => {
      // Simulate pressing Enter
      const enterEvent = new KeyboardEvent("keydown", {
        key: "Enter",
        code: "Enter",
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true,
      });
      textarea.dispatchEvent(enterEvent);
    }, 100);
  } else {
    showConfirmationBubble("Context injected! Press ENTER to send", "success");
  }
}

// Listen for background messages (from popup, etc.)
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

/**
 * Save the selected text to the context.
 */
function handleSaveSelectedContext() {
  console.log("[AI Context Vault] Handling text selection...");

  // First check if we have a textarea selection
  const textarea = findActiveTextarea();
  let selectedText = "";

  if (textarea) {
    // If it's a contenteditable div
    if (textarea.tagName.toLowerCase() === "div") {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        if (textarea.contains(range.commonAncestorContainer)) {
          selectedText = range.toString().trim();
          console.log(
            "[AI Context Vault] Found selection in contenteditable div"
          );
        }
      }
    } else {
      // Standard textarea
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      if (start !== end) {
        selectedText = textarea.value.substring(start, end).trim();
        console.log("[AI Context Vault] Found selection in standard textarea");
      }
    }
  }

  // If no selection in textarea, fall back to general window selection
  if (!selectedText) {
    selectedText = window.getSelection().toString().trim();
    console.log("[AI Context Vault] Using window selection");
  }

  if (selectedText) {
    console.log(
      "[AI Context Vault] Saving selected text:",
      selectedText.substring(0, 30) + "..."
    );
    const { domain, chatId } = parseUrlForIds(window.location.href);
    import("../storage/contextStorage").then(async (storage) => {
      await storage.addContext(domain, chatId, selectedText);
      showConfirmationBubble(
        "Added to Context: " + selectedText.substring(0, 30) + "...",
        "success"
      );

      // Trigger a custom event to notify the overlay to refresh
      const event = new CustomEvent("ai-context-updated", {
        detail: { domain, chatId },
      });
      document.dispatchEvent(event);
    });
  } else {
    console.log("[AI Context Vault] No text selected to save");
    showConfirmationBubble("No text selected to save", "warning");
  }
}

/**
 * Show a temporary bubble message (e.g., success, warning, error).
 */
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

  // Fade-in
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

document.addEventListener("DOMContentLoaded", () => {
  incrementSendCountAndMaybeWarn();
});

function showContextReminderBubble(message) {
  const bubble = document.createElement("div");
  bubble.innerText = message;
  Object.assign(bubble.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    padding: "10px 14px",
    background: "#332a00",
    color: "#ffcc00",
    border: "1px solid #665500",
    borderRadius: "6px",
    fontFamily: "sans-serif",
    zIndex: 2147483647,
    boxShadow: "0 4px 10px rgba(0, 0, 0, 0.3)",
  });
  document.body.appendChild(bubble);
  setTimeout(() => bubble.remove(), 4000);
}

function incrementSendCountAndMaybeWarn() {
  const { domain, chatId } = parseUrlForIds(window.location.href);
  const key = `send_count_${domain}_${chatId}`;

  chrome.storage.local.get([key], (result) => {
    const current = parseInt(result[key] || "0", 10) + 1;

    chrome.storage.local.set({ [key]: current }, () => {
      if (current % 12 === 0) {
        showContextReminderBubble(
          "🔁 Reminder: AI may forget earlier details. Consider re-injecting your key context."
        );
      }
    });
  });
}

// Observe input boxes instead of relying on button clicks
const observer = new MutationObserver(() => {
  const inputBox = document.querySelector(
    "textarea, div[contenteditable='true']"
  );
  if (!inputBox) return;

  inputBox.addEventListener("keydown", (e) => {
    const isMac = /Mac|iPhone|iPod|iPad/.test(navigator.platform);
    const sendKey = isMac
      ? e.metaKey && e.key === "Enter"
      : e.ctrlKey && e.key === "Enter";
    if (sendKey) {
      incrementSendCountAndMaybeWarn();
    }
  });
});

observer.observe(document.body, { childList: true, subtree: true });
