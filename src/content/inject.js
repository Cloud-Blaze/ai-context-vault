// inject.js
// Content script that provides keyboard shortcut to inject context into AI chat messages,
// with a modified approach to prevent ChatGPT from intercepting CMD+ENTER/CTRL+ENTER.

import { parseUrlForIds, getContext } from "../storage/contextStorage";

/*
 * AI Context Vault Keyboard Shortcuts
 * ----------------------------------
 * CMD+J (Mac) or CTRL+J (Windows/Linux): Toggle context overlay
 * CMD+I (Mac) or CTRL+I (Windows/Linux): Save selected text to context
 * ALT+ENTER: Inject context into message box (without sending)
 * ALT+SHIFT+ENTER: Inject context and automatically send message
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

  // Ensure the overlay element exists in the DOM
  ensureOverlayExists();

  console.log("[AI Context Vault] Initialization complete");
})();

/**
 * Ensure that the context overlay exists in the DOM.
 * If it doesn't exist, create it. This is where we display the saved context items.
 */
function ensureOverlayExists() {
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
    document.addEventListener("ai-context-refresh-requested", function (event) {
      refreshOverlayContent(overlayPanel);
    });

    // Add event listener for the context updated event
    document.addEventListener("ai-context-updated", function (event) {
      refreshOverlayContent(overlayPanel);
    });

    // Initial content population
    refreshOverlayContent(overlayPanel);
  } else {
    console.log("[AI Context Vault] Overlay already exists in DOM");
  }

  return overlayPanel;
}

/**
 * Refresh the content of the overlay with current context data.
 */
function refreshOverlayContent(overlayPanel) {
  const contentContainer = document.getElementById("__ai_context_content__");
  if (!contentContainer) {
    console.error("[AI Context Vault] Content container not found in overlay");
    return;
  }

  // Get current context
  const { domain, chatId } = parseUrlForIds(window.location.href);
  const contextData = getContext(domain, chatId);

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
          import("../storage/contextStorage").then((storage) => {
            storage.deleteContext(domain, chatId, entry.text);
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
      // CMD+I / CTRL+I to save selected text
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

      // CMD+J / CTRL+J: Toggle overlay
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
 * Toggle the context overlay visibility.
 */
function toggleOverlay() {
  // First ensure the overlay exists
  const panel = ensureOverlayExists();

  // Log current computed style
  const currentDisplayStyle = window.getComputedStyle(panel).display;
  console.log(
    "[AI Context Vault] Current overlay computed style:",
    currentDisplayStyle
  );

  // If panel is already visible, trigger a context refresh before toggling
  if (panel.style.display !== "none" && currentDisplayStyle !== "none") {
    // Trigger context refresh
    const { domain, chatId } = parseUrlForIds(window.location.href);
    const refreshEvent = new CustomEvent("ai-context-refresh-requested", {
      detail: { domain, chatId, forceRefresh: true },
    });
    document.dispatchEvent(refreshEvent);
    console.log("[AI Context Vault] Requested context refresh");
  }

  if (panel.style.display === "none" || currentDisplayStyle === "none") {
    // Show
    panel.style.display = "block";
    panel.style.visibility = "visible";
    panel.style.opacity = "1";
    panel.style.zIndex = "999999";
    console.log("[AI Context Vault] Forced overlay to VISIBLE");
  } else {
    // Hide
    panel.style.display = "none";
    panel.style.visibility = "hidden";
    panel.style.opacity = "0";
    console.log("[AI Context Vault] Forced overlay to HIDDEN");
  }

  // Double-check after a short delay
  setTimeout(() => {
    const newDisplayStyle = window.getComputedStyle(panel).display;
    console.log(
      "[AI Context Vault] Overlay display after toggle:",
      newDisplayStyle
    );

    // If styles didn't persist, try a more direct approach
    if (
      (panel.style.display === "block" && newDisplayStyle === "none") ||
      (panel.style.display === "none" && newDisplayStyle !== "none")
    ) {
      console.log("[AI Context Vault] Styles didn't persist! Forcing override");
      const styleId = "__ai_context_overlay_style_fix";
      let styleTag = document.getElementById(styleId);

      if (!styleTag) {
        styleTag = document.createElement("style");
        styleTag.id = styleId;
        document.head.appendChild(styleTag);
      }

      if (panel.style.display === "block") {
        styleTag.textContent = `
          #__ai_context_overlay__ {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            z-index: 999999 !important;
            position: fixed !important;
          }
        `;
      } else {
        styleTag.textContent = `
          #__ai_context_overlay__ {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
          }
        `;
      }
    }
  }, 100);
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
    // Standard textarea
    currentContent = textarea.value;
  }

  // Get context data
  const { domain, chatId } = parseUrlForIds(window.location.href);
  const contextData = getContext(domain, chatId);
  const formattedContext = formatContextForPrompt(contextData);

  if (!formattedContext) {
    showConfirmationBubble("No context available to inject", "warning");
    return;
  }

  // Construct the new content
  const newContent =
    "‼️ CONTEXT PROTOCOL - HIGHEST PRIORITY:\n\n" +
    formattedContext +
    '\n\n📏EXECUTION PARAMETERS:\n- Full contextual compliance is a non-negotiable requirement\n\n- Deviation from established context is prohibited\n\n- Every response must be comprehensively informed by and aligned with this context\n\nCONTINUED INTERACTION:\n-Preserve and apply all previous contextual understanding\n-Integrate new input with existing knowledge\n-Respond comprehensively and contextually\n\n🆕NEW USER PROMPT: \n"' +
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
    import("../storage/contextStorage").then((storage) => {
      storage.addContext(domain, chatId, selectedText);
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
