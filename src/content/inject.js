// inject.js
// Content script that provides keyboard shortcut to inject context into AI chat messages,
// with a modified approach to prevent ChatGPT from intercepting CMD+ENTER/CTRL+ENTER.

import {
  getBookmarks,
  parseUrlForIds,
  getContext,
  deleteBookmark,
  updateBookmarkLabel,
  saveContext,
  getContextKey,
} from "../storage/contextStorage";
import "./styles.css";

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
  let overlayPanel = document.getElementById("__ai_context_overlay__");

  if (!overlayPanel) {
    console.log("[AI Context Vault] Overlay not found in DOM, creating it...");

    overlayPanel = document.createElement("div");
    overlayPanel.id = "__ai_context_overlay__";
    overlayPanel.className = "ai-context-overlay";

    const header = document.createElement("div");
    header.className = "ai-context-header";

    const title = document.createElement("h3");
    title.textContent = "AI Context Vault";
    title.className = "ai-context-title";

    const closeButton = document.createElement("button");
    closeButton.textContent = "×";
    closeButton.className = "ai-context-close";

    closeButton.addEventListener("click", function () {
      overlayPanel.style.display = "none";
    });

    header.appendChild(title);
    header.appendChild(closeButton);

    const content = document.createElement("div");
    content.id = "__ai_context_content__";

    overlayPanel.appendChild(header);
    overlayPanel.appendChild(content);

    document.body.appendChild(overlayPanel);

    console.log("[AI Context Vault] Created overlay element and added to DOM");

    document.addEventListener(
      "ai-context-refresh-requested",
      async function (event) {
        await refreshOverlayContent(overlayPanel);
      }
    );

    document.addEventListener("ai-context-updated", async function (event) {
      await refreshOverlayContent(overlayPanel);
    });

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

  const { domain, chatId } = parseUrlForIds(window.location.href);

  contentContainer.innerHTML = "";

  const tabsContainer = document.createElement("div");
  tabsContainer.className = "ai-context-tabs";

  const contextTab = document.createElement("button");
  const bookmarksTab = document.createElement("button");

  contextTab.textContent = "Context";
  bookmarksTab.textContent = "Bookmarks";

  contextTab.className = "ai-context-tab active";
  bookmarksTab.className = "ai-context-tab inactive";

  const contextSection = document.createElement("div");
  const bookmarksSection = document.createElement("div");
  bookmarksSection.style.display = "none";

  contextTab.onclick = () => {
    contextTab.className = "ai-context-tab active";
    bookmarksTab.className = "ai-context-tab inactive";
    contextSection.style.display = "block";
    bookmarksSection.style.display = "none";
  };
  bookmarksTab.onclick = () => {
    bookmarksTab.className = "ai-context-tab active";
    contextTab.className = "ai-context-tab inactive";
    bookmarksSection.style.display = "block";
    contextSection.style.display = "none";
  };

  tabsContainer.appendChild(contextTab);
  tabsContainer.appendChild(bookmarksTab);
  contentContainer.appendChild(tabsContainer);
  contentContainer.appendChild(contextSection);
  contentContainer.appendChild(bookmarksSection);

  // Add Import/Export section to context section
  const importExportSection = document.createElement("div");
  importExportSection.className = "ai-context-import-export";

  const importExportTitle = document.createElement("h4");
  importExportTitle.textContent = "Import/Export";
  importExportTitle.className = "ai-context-section-title";

  const importExportTextarea = document.createElement("textarea");
  importExportTextarea.className = "ai-context-import-export-textarea";
  importExportTextarea.placeholder = "Paste JSON data here to import...";

  const importExportButtons = document.createElement("div");
  importExportButtons.className = "ai-context-import-export-buttons";

  const exportButton = document.createElement("button");
  exportButton.textContent = "Export";
  exportButton.className = "ai-context-import-export-button export";

  const importButton = document.createElement("button");
  importButton.textContent = "Import/Export";
  importButton.className = "ai-context-import-export-button import";

  const saveButton = document.createElement("button");
  saveButton.textContent = "Save";
  saveButton.className = "ai-context-import-export-button save";

  importExportButtons.appendChild(exportButton);
  importExportButtons.appendChild(importButton);
  importExportButtons.appendChild(saveButton);

  importExportSection.appendChild(importExportTitle);
  importExportSection.appendChild(importExportTextarea);
  importExportSection.appendChild(importExportButtons);

  // Export functionality
  exportButton.addEventListener("click", async () => {
    const contextData = await getContext(domain, chatId);
    importExportTextarea.value = JSON.stringify(contextData, null, 2);
    importExportTextarea.style.display = "block";
    saveButton.style.display = "none";
  });

  // Import functionality
  importButton.addEventListener("click", () => {
    importExportTextarea.style.display = "block";
    saveButton.style.display = "inline-block";
  });

  // Save functionality
  saveButton.addEventListener("click", async () => {
    try {
      const importData = JSON.parse(importExportTextarea.value);

      // Validate the import data structure
      if (!importData.entries || !Array.isArray(importData.entries)) {
        throw new Error("Invalid context data structure");
      }

      // Delete existing context for this chat
      const key = getContextKey(domain, chatId);
      await chrome.storage.local.remove(key);
      // Save new context data
      await saveContext(domain, chatId, importData);

      // Refresh the UI
      await refreshOverlayContent(overlayPanel);

      // Hide the textarea and save button
      importExportTextarea.style.display = "none";
      saveButton.style.display = "none";

      showConfirmationBubble("Context imported successfully", "success");
    } catch (error) {
      console.error("[AI Context Vault] Import failed:", error);
      showConfirmationBubble(
        "Failed to import context: " + error.message,
        "error"
      );
    }
  });

  contextSection.appendChild(importExportSection);

  const contextData = await getContext(domain, chatId);
  if (
    !contextData ||
    !contextData.entries ||
    contextData.entries.length === 0
  ) {
    const noContext = document.createElement("p");
    noContext.textContent =
      "No context available for this chat. Highlight text and press CMD+I/CTRL+I to add context.";
    noContext.style.color = "#999";
    contentContainer.appendChild(noContext);
  } else {
    if (contextData.summary) {
      const summarySection = document.createElement("div");
      summarySection.className = "ai-context-summary";

      const summaryTitle = document.createElement("h4");
      summaryTitle.textContent = "Summary";
      summaryTitle.className = "ai-context-section-title";

      const summaryText = document.createElement("p");
      summaryText.textContent = contextData.summary;
      summaryText.className = "ai-context-summary-text";

      summarySection.appendChild(summaryTitle);
      summarySection.appendChild(summaryText);
      contentContainer.appendChild(summarySection);
    }

    if (contextData.entries.length > 0) {
      const entriesSection = document.createElement("div");

      const entriesTitle = document.createElement("h4");
      entriesTitle.textContent = "Context Items";
      entriesTitle.className = "ai-context-section-title";

      entriesSection.appendChild(entriesTitle);

      const sortedEntries = [...contextData.entries].sort(
        (a, b) => (b.lastModified || b.created) - (a.lastModified || a.created)
      );

      sortedEntries.forEach((entry, index) => {
        const entryItem = createContextEntry(
          entry,
          domain,
          chatId,
          async (text) => {
            const storage = await import("../storage/contextStorage");
            await storage.deleteContext(domain, chatId, entry.id);
            await refreshOverlayContent(overlayPanel);
          },
          async (id, newLabel) => {
            const storage = await import("../storage/contextStorage");
            await storage.updateContext(domain, chatId, entry.text, newLabel);
            await refreshOverlayContent(overlayPanel);
          }
        );
        entriesSection.appendChild(entryItem);
      });

      contextSection.appendChild(entriesSection);
    }
  }

  const bookmarks = await getBookmarks(domain, chatId);
  if (!bookmarks || bookmarks.length === 0) {
    const noBookmarks = document.createElement("p");
    noBookmarks.textContent = "No bookmarks available.";
    noBookmarks.style.color = "#999";
    bookmarksSection.appendChild(noBookmarks);
  } else {
    const bookmarksTitle = document.createElement("h4");
    bookmarksTitle.textContent = "Chat Bookmarks";
    bookmarksTitle.className = "ai-context-section-title";
    bookmarksSection.appendChild(bookmarksTitle);

    bookmarks.forEach((entry) => {
      if (!entry || !entry.selector) return;

      const wrapper = createBookmarkEntry(
        entry,
        domain,
        chatId,
        async (id) => {
          await deleteBookmark(domain, chatId, id);
          await refreshOverlayContent(overlayPanel);
        },
        async (id, newLabel) => {
          await updateBookmarkLabel(domain, chatId, id, newLabel);
          await refreshOverlayContent(overlayPanel);
        }
      );
      bookmarksSection.appendChild(wrapper);
    });
  }

  console.log("[AI Context Vault] Refreshed overlay content with tabs");
}

function createBookmarkEntry(entry, domain, chatId, onDelete, onUpdate) {
  const wrapper = document.createElement("div");
  wrapper.className = "ai-context-bookmark";

  const delBtn = document.createElement("button");
  delBtn.textContent = "×";
  delBtn.className = "ai-context-button delete";
  delBtn.onclick = () => onDelete(entry.id);

  const labelContainer = document.createElement("div");
  labelContainer.className = "ai-context-bookmark-label";

  const labelText = document.createElement("div");
  labelText.textContent = `🔖 ${entry.label || "Bookmark"}`;
  labelText.title = new Date(entry.created).toLocaleString();

  labelText.onclick = () => {
    try {
      const matches = Array.from(document.querySelectorAll("body *")).filter(
        (el) => {
          if (el.closest("#__ai_context_overlay__")) return false;
          return (
            el.childNodes.length === 1 &&
            el.innerText &&
            el.innerText.includes(entry.fallbackText)
          );
        }
      );

      if (matches.length > 0) {
        const node = matches[matches.length - 1];
        node.scrollIntoView({ behavior: "smooth", block: "center" });
        node.style.outline = "2px dashed #4ade80";
        setTimeout(() => {
          node.style.outline = "none";
        }, 6000);
      } else {
        alert("Bookmark element not found on page.");
      }
    } catch (err) {
      console.error("[AI Context Vault] Bookmark jump failed:", err);
    }
  };

  const labelInput = document.createElement("input");
  labelInput.type = "text";
  labelInput.value = entry.label || "";
  labelInput.className = "ai-context-bookmark-input";

  labelContainer.appendChild(labelText);
  labelContainer.appendChild(labelInput);

  const editBtn = document.createElement("button");
  editBtn.innerHTML = "✎";
  editBtn.className = "ai-context-button edit";

  editBtn.onclick = async () => {
    const isEditing = labelInput.style.display === "block";

    if (!isEditing) {
      labelText.style.display = "none";
      labelInput.style.display = "block";
      labelInput.focus();
      editBtn.innerHTML = "✓";
    } else {
      const newLabel = labelInput.value.trim();
      labelText.style.display = "block";
      labelInput.style.display = "none";
      editBtn.innerHTML = "✎";

      if (newLabel && newLabel !== entry.label) {
        try {
          await onUpdate(entry.id, newLabel);
          entry.label = newLabel;
          labelText.textContent = `🔖 ${newLabel}`;
          showConfirmationBubble("Bookmark label updated", "success");
        } catch (err) {
          console.error(
            "[AI Context Vault] Error updating bookmark label:",
            err
          );
          showConfirmationBubble("Failed to update bookmark", "error");
        }
      }
    }
  };

  wrapper.appendChild(labelContainer);
  wrapper.appendChild(delBtn);
  wrapper.appendChild(editBtn);

  return wrapper;
}

function createContextEntry(entry, domain, chatId, onDelete, onUpdate) {
  const entryItem = document.createElement("div");
  entryItem.className = "ai-context-entry";

  const textContainer = document.createElement("div");
  textContainer.className = "ai-context-entry-text";

  const text = document.createElement("div");
  text.textContent = entry.text;

  const editTextarea = document.createElement("textarea");
  editTextarea.value = entry.text;
  editTextarea.className = "ai-context-entry-textarea";

  textContainer.appendChild(text);
  textContainer.appendChild(editTextarea);

  const buttonContainer = document.createElement("div");
  buttonContainer.className = "ai-context-entry-buttons";

  const deleteButton = document.createElement("button");
  deleteButton.textContent = "×";
  deleteButton.className = "ai-context-button delete";

  const editButton = document.createElement("button");
  editButton.innerHTML = "✎";
  editButton.className = "ai-context-button edit";

  editButton.addEventListener("click", async function () {
    const isEditing = editTextarea.style.display === "block";

    if (!isEditing) {
      text.style.display = "none";
      editTextarea.style.display = "block";
      editButton.innerHTML = "✓";

      const allEntries =
        entryItem.parentElement.querySelectorAll(".ai-context-entry");
      allEntries.forEach((e) => {
        if (e !== entryItem) {
          e.style.display = "none";
        }
      });

      editTextarea.focus();
    } else {
      const newText = editTextarea.value.trim();
      if (newText && newText !== entry.text) {
        try {
          const storage = await import("../storage/contextStorage");
          await storage.updateContext(domain, chatId, entry.text, newText);
          entry.text = newText;
          text.textContent = newText;
          showConfirmationBubble("Context updated successfully", "success");
        } catch (error) {
          console.error("[AI Context Vault] Error updating context:", error);
          showConfirmationBubble("Failed to update context", "error");
        }
      }

      text.style.display = "block";
      editTextarea.style.display = "none";
      editButton.innerHTML = "✎";

      const allEntries =
        entryItem.parentElement.querySelectorAll(".ai-context-entry");
      allEntries.forEach((e) => {
        e.style.display = "flex";
      });
    }
  });

  deleteButton.addEventListener("click", () => onDelete(entry.text));

  buttonContainer.appendChild(deleteButton);
  buttonContainer.appendChild(editButton);
  entryItem.appendChild(textContainer);
  entryItem.appendChild(buttonContainer);

  return entryItem;
}

function generateSimpleSelector(el) {
  if (!el) return null;

  // Use id if it's meaningful
  if (el.id && !el.id.startsWith("__")) return `#${el.id}`;

  // Otherwise, use tag and maybe text content
  const tag = el.tagName.toLowerCase();
  const text = el.textContent.trim().split(" ").slice(0, 3).join(" ");
  return `${tag}:contains("${text}")`;
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
    async (event) => {
      if (
        event.key === "Enter" &&
        !event.shiftKey && // Make sure it's not Shift+Enter (new line)
        !event.isComposing // IME input
      ) {
        incrementSendCountAndMaybeWarn();
      }

      // ALT+B or CMD+B → Bookmark selection
      const isMac =
        navigator.userAgentData?.platform === "macOS" ||
        navigator.platform?.toUpperCase().includes("MAC");
      const isB = event.key.toLowerCase() === "b";
      if ((isMac && event.metaKey && isB) || (!isMac && event.ctrlKey && isB)) {
        const selection = window.getSelection();
        const selectedText = selection?.toString()?.trim();

        if (!selectedText) {
          showConfirmationBubble("No text selected to bookmark", "warning");
          return;
        }

        const { domain, chatId } = parseUrlForIds(window.location.href);
        const range = selection.getRangeAt(0);
        const node = range.startContainer?.parentElement;

        const fallbackText = selectedText;
        const label = selectedText.slice(0, 50);

        // Attempt to create a unique selector
        const selector = generateSimpleSelector(node);

        const { addBookmark } = await import("../storage/contextStorage.js");
        await addBookmark(domain, chatId, label, selector, fallbackText);
        showConfirmationBubble("🔖 Bookmark added", "success");

        // Refresh UI
        const event = new CustomEvent("ai-context-updated", {
          detail: { domain, chatId },
        });
        document.dispatchEvent(event);
      }

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
  if (message.type === "REFRESH_OVERLAY") {
    console.log("[AI Context Vault] Refreshing overlay content");
    const overlayPanel = document.getElementById("__ai_context_overlay__");
    if (overlayPanel) {
      refreshOverlayContent(overlayPanel);
    }
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
  bubble.className = `ai-context-bubble ${type}`;

  document.body.appendChild(bubble);

  setTimeout(() => {
    bubble.style.opacity = "1";
  }, 10);

  setTimeout(() => {
    bubble.style.opacity = "0";
    bubble.style.transform = "translateY(10px)";
    setTimeout(() => bubble.remove(), 300);
  }, 3000);
}

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

async function incrementSendCountAndMaybeWarn() {
  const { domain, chatId } = parseUrlForIds(window.location.href);
  const key = `send_count_${domain}_${chatId}`;

  const result = await chrome.storage.local.get([key]);
  const current = parseInt(result[key] || "0", 10) + 1;

  await chrome.storage.local.set({ [key]: current });

  if (current % 12 === 0) {
    const contextData = await getContext(domain, chatId);

    if (contextData.entries && contextData.entries.length > 0) {
      showContextReminderBubble(
        "🔁 AI Context Vault Reminder: AI may forget earlier details. Consider re-injecting your key context by pressing ALT+ENTER in a chat window"
      );
    }
  }
}

export function scrollToBookmark(entry) {
  try {
    let node = null;

    // First try using querySelector if we stored something like a tag and text
    if (entry.selector) {
      node = document.querySelector(entry.selector);
    }

    // Fallback: try to find a DOM node that matches fallback text content
    if (!node && entry.fallbackText) {
      const matches = Array.from(
        document.querySelectorAll("div, span, p")
      ).filter((el) => el.textContent.includes(entry.fallbackText));
      node = matches.length > 0 ? matches[0] : null;
    }

    if (node) {
      node.scrollIntoView({ behavior: "smooth", block: "center" });
      node.style.outline = "3px dashed #4ade80";
      setTimeout(() => (node.style.outline = "none"), 3000);
    } else {
      alert("Bookmark could not be found on this page.");
    }
  } catch (e) {
    console.error("[AI Context Vault] Failed to scroll to bookmark:", e);
    alert("Error resolving bookmark.");
  }
}
