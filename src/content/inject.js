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
  getTemplate,
} from "../storage/contextStorage.js";
import "./inject.css";
import { GodModeStorage } from "../services/godModeStorage.js";
import React from "react";
import { createRoot } from "react-dom/client";
import TopicNodeTree from "./components/TopicNodeTree";

var closeCategories = () => {};

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

  // Update the overlay panel width
  // Object.assign(overlayPanel.style, {
  //   position: "fixed",
  //   top: "20px",
  //   right: "20px",
  //   width: "600px !important", // Increased from 400px to 500px
  //   maxHeight: "80vh",
  //   backgroundColor: "#1a1a1a",
  //   border: "1px solid #333",
  //   borderRadius: "8px",
  //   boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3)",
  //   zIndex: "2147483647",
  //   display: "none",
  //   flexDirection: "column",
  //   overflow: "hidden",
  //   color: "#fff",
  //   fontFamily: "system-ui, -apple-system, sans-serif",
  // });

  return overlayPanel;
}

/**
 * Refresh the content of the overlay with current context data.
 */
async function refreshOverlayContent(overlayPanel) {
  const contentContainer = document.getElementById("__ai_context_content__");
  const { domain, chatId } = parseUrlForIds(window.location.href);

  if (!contentContainer) {
    console.error("[AI Context Vault] Content container not found in overlay");
    return;
  }

  contentContainer.innerHTML = "";

  const tabsContainer = document.createElement("div");
  tabsContainer.className = "ai-context-tabs";

  const contextTab = document.createElement("button");
  const bookmarksTab = document.createElement("button");
  contextTab.textContent = "Context";
  bookmarksTab.textContent = "Bookmarks";

  const contextSection = document.createElement("div");
  const bookmarksSection = document.createElement("div");

  // Check God Mode enabled state
  const storage = GodModeStorage.getInstance();
  const isGodModeEnabled = await storage.checkEnabledState();
  let godModeTab = null,
    godModeSection = null;
  if (isGodModeEnabled) {
    godModeTab = document.createElement("button");
    godModeTab.textContent = "God Mode";
    godModeSection = document.createElement("div");
  }

  // Get the last active tab from storage
  chrome.storage.local.get(["lastActiveTab"], (result) => {
    const lastActiveTab = result.lastActiveTab || "context";
    if (lastActiveTab === "bookmarks") {
      contextTab.className = "ai-context-tab inactive";
      bookmarksTab.className = "ai-context-tab active";
      contextSection.style.display = "none";
      bookmarksSection.style.display = "block";
      if (isGodModeEnabled && godModeTab && godModeSection) {
        godModeTab.className = "ai-context-tab inactive";
        godModeSection.style.display = "none";
      }
    } else if (
      lastActiveTab === "godmode" &&
      isGodModeEnabled &&
      godModeTab &&
      godModeSection
    ) {
      contextTab.className = "ai-context-tab inactive";
      bookmarksTab.className = "ai-context-tab inactive";
      godModeTab.className = "ai-context-tab active";
      contextSection.style.display = "none";
      bookmarksSection.style.display = "none";
      godModeSection.style.display = "block";
    } else {
      contextTab.className = "ai-context-tab active";
      bookmarksTab.className = "ai-context-tab inactive";
      contextSection.style.display = "block";
      bookmarksSection.style.display = "none";
      if (isGodModeEnabled && godModeTab && godModeSection) {
        godModeTab.className = "ai-context-tab inactive";
        godModeSection.style.display = "none";
      }
    }
  });

  contextTab.onclick = () => {
    contextTab.className = "ai-context-tab active";
    bookmarksTab.className = "ai-context-tab inactive";
    contextSection.style.display = "block";
    bookmarksSection.style.display = "none";
    if (isGodModeEnabled && godModeTab && godModeSection) {
      godModeTab.className = "ai-context-tab inactive";
      godModeSection.style.display = "none";
    }
    chrome.storage.local.set({ lastActiveTab: "context" });
  };

  bookmarksTab.onclick = () => {
    bookmarksTab.className = "ai-context-tab active";
    contextTab.className = "ai-context-tab inactive";
    bookmarksSection.style.display = "block";
    contextSection.style.display = "none";
    if (isGodModeEnabled && godModeTab && godModeSection) {
      godModeTab.className = "ai-context-tab inactive";
      godModeSection.style.display = "none";
    }
    chrome.storage.local.set({ lastActiveTab: "bookmarks" });
  };

  if (isGodModeEnabled && godModeTab && godModeSection) {
    godModeTab.onclick = () => {
      godModeTab.className = "ai-context-tab active";
      contextTab.className = "ai-context-tab inactive";
      bookmarksTab.className = "ai-context-tab inactive";
      godModeSection.style.display = "block";
      contextSection.style.display = "none";
      bookmarksSection.style.display = "none";
      chrome.storage.local.set({ lastActiveTab: "godmode" });
    };
  }

  tabsContainer.appendChild(contextTab);
  tabsContainer.appendChild(bookmarksTab);
  if (isGodModeEnabled && godModeTab) tabsContainer.appendChild(godModeTab);

  contentContainer.appendChild(tabsContainer);
  contentContainer.appendChild(contextSection);
  contentContainer.appendChild(bookmarksSection);
  if (isGodModeEnabled && godModeSection)
    contentContainer.appendChild(godModeSection);

  // Add Import/Export section to context section
  const importExportSection = document.createElement("div");
  importExportSection.className = "ai-context-import-export";

  const importExportTextarea = document.createElement("textarea");
  importExportTextarea.className = "ai-context-import-export-textarea";
  importExportTextarea.placeholder = "Paste JSON data here to import...";

  const importExportButtons = document.createElement("div");
  importExportButtons.className = "ai-context-import-export-buttons";

  const importButton = document.createElement("button");
  importButton.textContent = "Import/Export";
  importButton.className = "ai-context-import-export-button import";

  const saveButton = document.createElement("button");
  saveButton.textContent = "Save";
  saveButton.className = "ai-context-import-export-button save";

  importExportButtons.appendChild(importButton);
  importExportButtons.appendChild(saveButton);

  importExportSection.appendChild(importExportTextarea);
  importExportSection.appendChild(importExportButtons);

  // Preload the current context data into the textarea
  const currentContextData = await getContext(domain, chatId);
  importExportTextarea.value = JSON.stringify(currentContextData, null, 2);

  // Import functionality
  importButton.addEventListener("click", () => {
    importExportTextarea.style.display = "block";
    saveButton.style.display = "inline-block";
    importButton.style.display = "none";
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

      // Hide the textarea and save button, show import button again
      importExportTextarea.style.display = "none";
      saveButton.style.display = "none";
      importButton.style.display = "inline-block";

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
    // Remove the old message creation here since it's now in the storage callback
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
            const storage = await import("../storage/contextStorage.js");
            await storage.deleteContext(domain, chatId, entry.id);
            await refreshOverlayContent(overlayPanel);
          },
          async (id, newLabel) => {
            const storage = await import("../storage/contextStorage.js");
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
    noBookmarks.textContent =
      "No bookmarks available. Highlight text and press CMD+B/CTRL+B to add a bookmark.";
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
  // Get God Mode logs for current chat
  const logs = await storage.getLogs(chatId);
  console.debug("God Mode logs for chatId", chatId, logs);

  if (isGodModeEnabled) {
    godModeSection.innerHTML = ""; // Clear previous logs
    if (logs.entries.length === 0) {
      const noLogs = document.createElement("p");
      noLogs.textContent = "No God Mode logs available yet.";
      noLogs.style.color = "#999";
      godModeSection.appendChild(noLogs);
    } else {
      const logsContainer = document.createElement("div");
      logsContainer.className = "ai-context-godmode-logs";
      Object.assign(logsContainer.style, {
        maxHeight: "400px",
        overflowY: "auto",
        padding: "8px",
      });

      logs.entries.reverse().forEach((entry) => {
        // console.log("Rendering God Mode entry:", entry);
        const logEntry = document.createElement("div");
        logEntry.className = "ai-context-godmode-entry";
        Object.assign(logEntry.style, {
          padding: "8px",
          marginBottom: "8px",
          borderRadius: "4px",
          backgroundColor:
            entry.type === "input" ? "rgba(50, 50, 50, 0.85)" : "#000",
          border: "1px solid #666",
          color: "#fff",
        });

        const header = document.createElement("div");
        header.style.display = "flex";
        header.style.justifyContent = "space-between";
        header.style.marginBottom = "4px";
        header.style.fontSize = "12px";
        header.style.color = "#999";

        const type = document.createElement("span");
        type.textContent = entry.type === "input" ? "User Input" : "AI Output";
        type.style.fontWeight = "600";

        const time = document.createElement("span");
        time.textContent = new Date(
          entry.metadata.timestamp
        ).toLocaleTimeString();

        header.appendChild(type);
        header.appendChild(time);
        logEntry.appendChild(header);

        // Always show text if present
        const textValue =
          entry.text && entry.text.trim() !== ""
            ? entry.text
            : entry.content || "";
        // console.debug(
        //   "Text value to render:",
        //   textValue,
        //   "for entry:",
        //   entry,
        //   entry.content
        // );
        if (textValue && textValue.trim() !== "") {
          const textDiv = document.createElement("div");
          textDiv.style.fontSize = "13px";
          textDiv.style.whiteSpace = "pre-wrap";
          textDiv.style.color = "#fff";
          textDiv.textContent = textValue;
          logEntry.appendChild(textDiv);
        }

        // Show code block if present
        if (Array.isArray(entry.metadata?.codeBlocks)) {
          entry.metadata.codeBlocks.forEach((block) => {
            const codeContainer = document.createElement("div");
            codeContainer.style.marginTop = "8px";
            codeContainer.style.backgroundColor = "rgba(0, 0, 0, 0.2)";
            codeContainer.style.padding = "8px";
            codeContainer.style.borderRadius = "4px";
            codeContainer.style.fontFamily = "monospace";
            codeContainer.style.whiteSpace = "pre-wrap";
            codeContainer.style.overflowX = "auto";
            codeContainer.textContent = block.content;
            logEntry.appendChild(codeContainer);
          });
        } else if (
          entry.metadata?.codeBlock &&
          entry.metadata.codeBlock.content
        ) {
          const codeContainer = document.createElement("div");
          codeContainer.style.marginTop = "8px";
          codeContainer.style.backgroundColor = "rgba(0, 0, 0, 0.2)";
          codeContainer.style.padding = "8px";
          codeContainer.style.borderRadius = "4px";
          codeContainer.style.fontFamily = "monospace";
          codeContainer.style.whiteSpace = "pre-wrap";
          codeContainer.style.overflowX = "auto";
          codeContainer.textContent = entry.metadata.codeBlock.content;
          logEntry.appendChild(codeContainer);
        }

        // Show image if present
        if (
          entry.metadata?.imageBlob &&
          entry.metadata.imageBlob instanceof Blob
        ) {
          const imgContainer = document.createElement("div");
          imgContainer.style.marginTop = "8px";
          imgContainer.style.maxWidth = "100%";
          imgContainer.style.overflow = "hidden";

          const img = document.createElement("img");
          img.src = URL.createObjectURL(entry.metadata.imageBlob);
          img.style.maxWidth = "100%";
          img.style.height = "auto";
          img.style.borderRadius = "4px";

          imgContainer.appendChild(img);
          logEntry.appendChild(imgContainer);
        }

        // Add to Context button logic
        const isInContext = contextData?.entries?.some(
          (ctxEntry) => (ctxEntry.text || ctxEntry.content) === textValue
        );
        if (!isInContext && textValue && textValue.trim() !== "") {
          const addToContextButton = document.createElement("button");
          addToContextButton.textContent = "Add to Context";
          Object.assign(addToContextButton.style, {
            marginTop: "8px",
            padding: "4px 8px",
            backgroundColor: "#10b981",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: "500",
            transition: "background-color 0.2s",
          });

          addToContextButton.addEventListener("mouseover", () => {
            addToContextButton.style.backgroundColor = "#059669";
          });

          addToContextButton.addEventListener("mouseout", () => {
            addToContextButton.style.backgroundColor = "#10b981";
          });

          addToContextButton.addEventListener("click", async () => {
            try {
              const { domain, chatId } = parseUrlForIds(window.location.href);
              // Get the full content including all code blocks
              let textToAdd = textValue;
              if (Array.isArray(entry.metadata?.codeBlocks)) {
                textToAdd +=
                  "\n\n" +
                  entry.metadata.codeBlocks
                    .map((cb) => cb.content)
                    .join("\n\n");
              } else if (entry.metadata?.codeBlock) {
                textToAdd += "\n\n" + entry.metadata.codeBlock.content;
              }
              if (!textToAdd || textToAdd.trim() === "") {
                console.warn(
                  "[AI Context Vault] No text content to add to context"
                );
                return;
              }
              const storage = await import("../storage/contextStorage");
              await storage.addContext(domain, chatId, textToAdd);
              const bubble = document.createElement("div");
              bubble.textContent = "Added to context!";
              Object.assign(bubble.style, {
                position: "fixed",
                bottom: "20px",
                right: "20px",
                padding: "8px 16px",
                backgroundColor: "#10b981",
                color: "#fff",
                borderRadius: "4px",
                zIndex: "2147483647",
                fontSize: "14px",
                fontWeight: "500",
              });
              document.body.appendChild(bubble);
              setTimeout(() => bubble.remove(), 2000);
              const overlayPanel = document.getElementById(
                "__ai_context_overlay__"
              );
              if (overlayPanel) {
                await refreshOverlayContent(overlayPanel);
              }
            } catch (error) {
              console.error("Error adding to context:", error);
              showConfirmationBubble("Failed to add to context", "error");
            }
          });
          logEntry.appendChild(addToContextButton);
        }

        logsContainer.appendChild(logEntry);
      });

      godModeSection.appendChild(logsContainer);
    }
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

  labelInput.addEventListener("keydown", async (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
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
  });

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

  let text, editTextarea;

  // Handle image entries
  if (
    entry.metadata?.imageUrl &&
    entry.metadata?.imageSize &&
    entry.metadata.imageSize > 0
  ) {
    const imageContainer = document.createElement("div");
    imageContainer.style.marginBottom = "8px";

    const image = document.createElement("img");
    image.src = entry.metadata.imageUrl;
    image.alt = "Generated image";
    image.style.maxWidth = "100%";
    image.style.borderRadius = "8px";
    image.style.marginBottom = "4px";

    const imageText = document.createElement("div");
    imageText.textContent = "Generated image";
    imageText.style.fontSize = "12px";
    imageText.style.color = "#999";

    imageContainer.appendChild(image);
    imageContainer.appendChild(imageText);
    textContainer.appendChild(imageContainer);
  }

  // Only add text elements if there's actual content
  if (entry.text && entry.text.trim() !== "") {
    text = document.createElement("div");
    text.textContent = entry.text;

    editTextarea = document.createElement("textarea");
    editTextarea.value = entry.text;
    editTextarea.className = "ai-context-entry-textarea";

    textContainer.appendChild(text);
    textContainer.appendChild(editTextarea);
  }

  entryItem.appendChild(textContainer);

  // Add buttons at the end
  if (entry.text && entry.text.trim() !== "") {
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
            const storage = await import("../storage/contextStorage.js");
            await storage.updateContext(domain, chatId, entry.text, newText);
            entry.text = newText;
            text.textContent = newText;
            showConfirmationBubble("Context updated successfully", "success");

            // Update the import/export textarea with latest data
            const updatedContextData = await getContext(domain, chatId);
            const importExportTextarea = document.querySelector(
              ".ai-context-import-export-textarea"
            );
            if (importExportTextarea) {
              importExportTextarea.value = JSON.stringify(
                updatedContextData,
                null,
                2
              );
            }
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
    entryItem.appendChild(buttonContainer);
  }

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

      // CMD+I or CTRL+I to save selected text
      const isI = event.key.toLowerCase() === "i";
      if ((isMac && event.metaKey && isI) || (!isMac && event.ctrlKey && isI)) {
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

      // CMD+J or CTRL+J to toggle overlay and show topic node tree
      if ((event.metaKey || event.ctrlKey) && event.key === "j") {
        event.preventDefault();
        toggleOverlay();

        // Create container for topic node tree if it doesn't exist
        let container = document.getElementById("topic-node-tree-container");
        if (!container) {
          container = document.createElement("div");
          container.id = "topic-node-tree-container";
          document.body.appendChild(container);
        }

        // Create root and render TopicNodeTree
        const root = createRoot(container);
        closeCategories = () => {
          root.unmount();
          container.remove();
        };
        root.render(
          <TopicNodeTree
            onClose={() => {
              toggleOverlay();
              closeCategories();
            }}
            onCloseCat={() => {
              closeCategories();
            }}
          />
        );
      }
    },
    true // Capture phase
  );
}

/**
 * Toggle the context overlay visibility with a settings cog to open index.html.
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
      top: "4px",
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
    closeCategories();
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
 * Clean function to inject text into the active textarea
 * @param {string} text - The text to inject
 * @param {boolean} shouldSendAfterInjection - Whether to send the message after injection
 */
export async function injectTextIntoTextarea(
  text,
  shouldSendAfterInjection = false
) {
  // Get the user's language preference
  const { ctx_language } = await chrome.storage.local.get("ctx_language");

  // If language is set and not English, prepend the language instruction
  if (ctx_language && ctx_language !== "English") {
    text = `The following prompt is written in english but I desire you to respond in ${ctx_language}.\n\n${text}`;
  }

  // Inject active profile context if selected
  let finalText = text;
  try {
    const storage = await import("../storage/contextStorage.js");
    const selectedAlias = await storage.getCurrentProfileSelected();
    if (selectedAlias) {
      const profiles = await storage.getProfiles();
      const profile = profiles.find((p) => p.alias === selectedAlias);
      if (profile && profile.prompt) {
        finalText = `${profile.prompt}\n\n` + text;
      }
    }
  } catch (e) {
    console.error("[AI Context Vault] Failed to inject profile context:", e);
  }

  const textarea = findActiveTextarea();
  if (!textarea) {
    console.log("[AI Context Vault] No active textarea found");
    return;
  }

  // Update the textarea
  if (textarea.tagName.toLowerCase() === "div") {
    // contenteditable div
    const htmlContent = finalText.replace(
      /\n/g,
      '<p><br class="ProseMirror-trailingBreak"></p>'
    );
    textarea.innerHTML = htmlContent;
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  } else {
    // standard textarea
    textarea.value = finalText;
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  }

  textarea.focus();

  // Show confirmation bubble
  showConfirmationBubble(
    `Text injected${shouldSendAfterInjection ? " and will be sent" : ""}`,
    "success"
  );

  // If shouldSendAfterInjection is true, send the message
  if (shouldSendAfterInjection) {
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
  }
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

  // Get user-customized context injection template
  const contextInjectionTemplate = await getTemplate(
    "ctx_context_injection_template",
    "\n\n📏EXECUTION PARAMETERS:\n- Full contextual compliance is a non-negotiable requirement\n\n- Deviation from established context is prohibited\n\n- Every response must be comprehensively informed by and aligned with this context\n\nCONTINUED INTERACTION:\n-Preserve and apply all previous contextual understanding\n-Integrate new input with existing knowledge\n-Respond comprehensively and contextually\n\n🆕NEW USER PROMPT ON "
  );

  // Construct the new content
  const newContent =
    "‼️ CONTEXT PROTOCOL - HIGHEST PRIORITY:\n\n" +
    formattedContext +
    contextInjectionTemplate +
    currentTimestamp +
    ': \n"' +
    currentContent +
    '"';

  await injectTextIntoTextarea(newContent, shouldSendAfterInjection);

  if (shouldSendAfterInjection) {
    showConfirmationBubble(
      "Injecting context and sending message...",
      "success"
    );
  } else {
    showConfirmationBubble("Context injected! Press ENTER to send", "success");
  }
}

// Listen for background messages (from popup, etc.)
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  console.log("[AI Context Vault] Message received:", message);

  if (message.type === "SAVE_SELECTED_CONTEXT") {
    handleSaveSelectedContext();
  }
  if (message.type === "TOGGLE_OVERLAY") {
    console.log("[AI Context Vault] Toggling overlay visibility");
    toggleOverlay();

    // Create container for topic node tree if it doesn't exist
    let container = document.getElementById("topic-node-tree-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "topic-node-tree-container";
      document.body.appendChild(container);
    }

    // Create root and render TopicNodeTree
    const root = createRoot(container);
    closeCategories = () => {
      root.unmount();
      container.remove();
    };
    root.render(
      <TopicNodeTree
        onClose={() => {
          toggleOverlay();
          closeCategories();
        }}
        onCloseCat={() => {
          closeCategories();
        }}
      />
    );
  }
  if (message.type === "REFRESH_OVERLAY") {
    console.log("[AI Context Vault] Refreshing overlay content");
    const overlayPanel = document.getElementById("__ai_context_overlay__");
    if (overlayPanel) {
      await refreshOverlayContent(overlayPanel);
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
    import("../storage/contextStorage.js").then(async (storage) => {
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
export function showConfirmationBubble(text, type = "success") {
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

// Provider adapters
const chatgptConfig = {
  name: "chatgpt",
  selectors: {
    userMessage: 'div[data-message-author-role="user"] .whitespace-pre-wrap',
    aiMessage: "article",
    aiText: ".markdown.prose p",
    codeBlock: "pre",
    codeContent: "code",
    codeLanguage: "div.flex.items-center",
    imageUrl: 'img[alt="Generated image"]',
    messageId: "[data-message-id]",
    modelSlug: "[data-message-model-slug]",
  },
  extractors: {
    userText: (element) => element.textContent.trim(),
    aiText: (element) => {
      const text = element
        .querySelector(chatgptConfig.selectors.aiText)
        ?.textContent.trim();
      // console.log("[AI Context Vault] Extracting AI text:", { text });
      return text;
    },
    codeBlock: (element) => {
      const preElement = element.querySelector(
        chatgptConfig.selectors.codeBlock
      );
      if (!preElement) return null;

      const codeElement = preElement.querySelector(
        chatgptConfig.selectors.codeContent
      );
      const languageElement = preElement.querySelector(
        chatgptConfig.selectors.codeLanguage
      );

      console.log("[AI Context Vault] Found code block:", {
        hasPre: !!preElement,
        hasCode: !!codeElement,
        hasLanguage: !!languageElement,
        language: languageElement?.textContent.trim(),
        content: codeElement?.textContent.trim(),
      });

      if (!codeElement) return null;

      return {
        language: languageElement?.textContent.trim() || "text",
        content: codeElement.textContent.trim(),
        html: codeElement.innerHTML,
      };
    },
    imageUrl: async (element) => {
      // Find all images under main
      const imgElements = document.querySelectorAll(
        'img[alt="Generated image"]'
      );

      if (!imgElements.length) {
        console.error("[AI Context Vault] No images found");
        return null;
      }

      // Get the first visible image
      const visibleImg = Array.from(imgElements).find((img) => {
        const style = window.getComputedStyle(img);
        return parseFloat(style.opacity) > 0;
      });

      if (!visibleImg?.src) {
        console.error("[AI Context Vault] No visible image found");
        return null;
      }

      try {
        console.log(
          "[AI Context Vault] Fetching image from URL:",
          visibleImg.src
        );
        const response = await fetch(visibleImg.src);
        const blob = await response.blob();
        return {
          url: visibleImg.src,
          blob: blob,
          type: blob.type,
          size: blob.size,
        };
      } catch (error) {
        console.error("[AI Context Vault] Error fetching image:", error);
        return null;
      }
    },
    messageId: (element) => element.getAttribute("data-message-id"),
    modelSlug: (element) => element.getAttribute("data-message-model-slug"),
  },
};

const providers = {
  "chat.openai.com": chatgptConfig,
  "chatgpt.com": chatgptConfig,
  "claude.ai": {
    name: "claude",
    selectors: {
      userMessage: 'div[data-message-author-role="user"] .whitespace-pre-wrap',
      aiMessage: "article",
      aiText: ".markdown.prose p",
      codeBlock: "pre",
      codeContent: "code",
      codeLanguage: "div.flex.items-center",
      imageUrl: 'img[alt="Generated image"]',
      messageId: "[data-message-id]",
      modelSlug: "[data-message-model-slug]",
    },
    extractors: {
      userText: (element) => element.textContent.trim(),
      aiText: (element) => {
        const text = element
          .querySelector(chatgptConfig.selectors.aiText)
          ?.textContent.trim();
        // console.log("[AI Context Vault] Extracting AI text:", { text });
        return text;
      },
      codeBlock: (element) => {
        const preElement = element.querySelector(
          chatgptConfig.selectors.codeBlock
        );
        if (!preElement) return null;

        const codeElement = preElement.querySelector(
          chatgptConfig.selectors.codeContent
        );
        const languageElement = preElement.querySelector(
          chatgptConfig.selectors.codeLanguage
        );

        console.log("[AI Context Vault] Found code block:", {
          hasPre: !!preElement,
          hasCode: !!codeElement,
          hasLanguage: !!languageElement,
          language: languageElement?.textContent.trim(),
          content: codeElement?.textContent.trim(),
        });

        if (!codeElement) return null;

        return {
          language: languageElement?.textContent.trim() || "text",
          content: codeElement.textContent.trim(),
          html: codeElement.innerHTML,
        };
      },
      imageUrl: async (element) => {
        // Find all images under main
        const imgElements = document.querySelectorAll(
          'img[alt="Generated image"]'
        );

        if (!imgElements.length) {
          console.error("[AI Context Vault] No images found");
          return null;
        }

        // Get the first visible image
        const visibleImg = Array.from(imgElements).find((img) => {
          const style = window.getComputedStyle(img);
          return parseFloat(style.opacity) > 0;
        });

        if (!visibleImg?.src) {
          console.error("[AI Context Vault] No visible image found");
          return null;
        }

        try {
          console.log(
            "[AI Context Vault] Fetching image from URL:",
            visibleImg.src
          );
          const response = await fetch(visibleImg.src);
          const blob = await response.blob();
          return {
            url: visibleImg.src,
            blob: blob,
            type: blob.type,
            size: blob.size,
          };
        } catch (error) {
          console.error("[AI Context Vault] Error fetching image:", error);
          return null;
        }
      },
      messageId: (element) => element.getAttribute("data-message-id"),
      modelSlug: (element) => element.getAttribute("data-message-model-slug"),
    },
  },
  // Add more providers here as needed
};

function getProviderForDomain(domain) {
  return providers[domain] || null;
}

function setupGodModeObserver() {
  const storage = GodModeStorage.getInstance();
  const { domain } = parseUrlForIds(window.location.href);
  const providerConfig = getProviderForDomain(domain);

  if (!providerConfig) {
    console.error(`No provider configuration found for domain: ${domain}`);
    return null;
  }
  let mutationFunc = async () => {};
  if (domain === "chatgpt.com" || domain === "chat.openai.com") {
    mutationFunc = async (mutations) => {
      const isGodModeEnabled = await storage.checkEnabledState();
      if (!isGodModeEnabled) return;

      const { chatId } = parseUrlForIds(window.location.href);
      if (!chatId) return;

      for (const mutation of mutations) {
        // console.log("[AI Context Vault] Mutation observed:", {
        //   type: mutation.type,
        //   target: mutation.target,
        //   addedNodes: mutation.addedNodes.length,
        //   removedNodes: mutation.removedNodes.length,
        //   characterData: mutation.type === "characterData",
        //   attributeName: mutation.attributeName,
        // });
        if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Check for images
              const images = node.querySelectorAll("img");
              for (const image of images) {
                if (image.alt === "Generated image") {
                  const parentMessage = image.closest(
                    providerConfig.selectors.aiMessage
                  );
                  if (parentMessage) {
                    const messageId =
                      providerConfig.extractors.messageId(parentMessage);
                    const model =
                      providerConfig.extractors.modelSlug(parentMessage);
                    const text =
                      providerConfig.extractors.aiText(parentMessage);
                    const codeBlocks = Array.from(
                      parentMessage.querySelectorAll("pre")
                    )
                      .map((pre) => {
                        const code = pre.querySelector("code");
                        const languageElem = pre.querySelector(
                          "div.flex.items-center"
                        );
                        return {
                          language: languageElem?.textContent.trim() || "text",
                          content:
                            code?.textContent.trim() ||
                            pre.textContent.trim() ||
                            "",
                        };
                      })
                      .filter((block) => block.content);

                    try {
                      const imageData =
                        await providerConfig.extractors.imageUrl(parentMessage);
                      console.debug(imageData, "imageData");
                      if (imageData) {
                        const logEntry = {
                          type: "output",
                          content: text || "",
                          metadata: {
                            timestamp: new Date().toISOString(),
                            messageId,
                            model,
                            provider: providerConfig.name,
                            imageUrl: imageData.url,
                            imageBlob: imageData.blob,
                            imageType: imageData.type,
                            imageSize: imageData.size,
                            isImageGeneration: true,
                            chatId,
                          },
                        };

                        if (codeBlocks.length > 0) {
                          logEntry.metadata.codeBlocks = codeBlocks;
                        }

                        await storage.addLog(chatId, logEntry);
                      }
                    } catch (error) {
                      console.error(
                        "[AI Context Vault] Error processing image:",
                        error
                      );
                    }
                  }
                }
              }

              // Look for user messages
              const userMessages = node.querySelectorAll(
                providerConfig.selectors.userMessage
              );
              for (const message of userMessages) {
                const text = providerConfig.extractors.userText(message);
                if (text) {
                  // console.log("[AI Context Vault] Found user message:", { text });
                  await storage.addLog(chatId, {
                    type: "input",
                    content: text,
                    metadata: {
                      timestamp: new Date().toISOString(),
                      messageId: providerConfig.extractors.messageId(message),
                      provider: providerConfig.name,
                      chatId,
                    },
                  });
                }
              }

              // Look for AI responses that don't have images
              const aiMessages = node.querySelectorAll(
                providerConfig.selectors.aiMessage
              );
              for (const message of aiMessages) {
                // Skip if this message has an image
                if (message.querySelector('img[alt="Generated image"]')) {
                  continue;
                }

                // console.debug(
                //   "[AI Context Vault] Processing AI message:",
                //   message
                // );

                const messageId = providerConfig.extractors.messageId(message);
                const model = providerConfig.extractors.modelSlug(message);
                const codeBlocks2 = Array.from(message.querySelectorAll("pre"))
                  .map((pre) => {
                    const code = pre.querySelector("code");
                    const languageElem = pre.querySelector(
                      "div.flex.items-center"
                    );
                    return {
                      language: languageElem?.textContent.trim() || "text",
                      content:
                        code?.textContent.trim() ||
                        pre.textContent.trim() ||
                        "",
                    };
                  })
                  .filter((block) => block.content);

                const text = providerConfig.extractors.aiText(message);

                const logEntry = {
                  type: "output",
                  content: text || "",
                  metadata: {
                    timestamp: new Date().toISOString(),
                    messageId,
                    model,
                    provider: providerConfig.name,
                    chatId,
                  },
                };

                if (codeBlocks2.length > 0) {
                  logEntry.metadata.codeBlocks = codeBlocks2;
                }

                await storage.addLog(chatId, logEntry);
              }
            }
          }
        }
      }
    };
  } else if (domain === "claude.ai") {
    mutationFunc = async (mutations) => {
      const isGodModeEnabled = await storage.checkEnabledState();
      if (!isGodModeEnabled) return;

      const { chatId } = parseUrlForIds(window.location.href);
      if (!chatId) return;

      for (const mutation of mutations) {
        // console.log("[AI Context Vault] Mutation observed:", {
        //   type: mutation.type,
        //   target: mutation.target,
        //   addedNodes: mutation.addedNodes.length,
        //   removedNodes: mutation.removedNodes.length,
        //   characterData: mutation.type === "characterData",
        //   attributeName: mutation.attributeName,
        // });
        if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Check for images
              const images = node.querySelectorAll("img");
              for (const image of images) {
                if (image.alt === "Generated image") {
                  const parentMessage = image.closest(
                    providerConfig.selectors.aiMessage
                  );
                  if (parentMessage) {
                    const messageId =
                      providerConfig.extractors.messageId(parentMessage);
                    const model =
                      providerConfig.extractors.modelSlug(parentMessage);
                    const text =
                      providerConfig.extractors.aiText(parentMessage);
                    const codeBlocks = Array.from(
                      parentMessage.querySelectorAll("pre")
                    )
                      .map((pre) => {
                        const code = pre.querySelector("code");
                        const languageElem = pre.querySelector(
                          "div.flex.items-center"
                        );
                        return {
                          language: languageElem?.textContent.trim() || "text",
                          content:
                            code?.textContent.trim() ||
                            pre.textContent.trim() ||
                            "",
                        };
                      })
                      .filter((block) => block.content);

                    try {
                      const imageData =
                        await providerConfig.extractors.imageUrl(parentMessage);
                      console.debug(imageData, "imageData");
                      if (imageData) {
                        const logEntry = {
                          type: "output",
                          content: text || "",
                          metadata: {
                            timestamp: new Date().toISOString(),
                            messageId,
                            model,
                            provider: providerConfig.name,
                            imageUrl: imageData.url,
                            imageBlob: imageData.blob,
                            imageType: imageData.type,
                            imageSize: imageData.size,
                            isImageGeneration: true,
                            chatId,
                          },
                        };

                        if (codeBlocks.length > 0) {
                          logEntry.metadata.codeBlocks = codeBlocks;
                        }

                        await storage.addLog(chatId, logEntry);
                      }
                    } catch (error) {
                      console.error(
                        "[AI Context Vault] Error processing image:",
                        error
                      );
                    }
                  }
                }
              }

              // Look for user messages
              const userMessages = node.querySelectorAll(
                providerConfig.selectors.userMessage
              );
              for (const message of userMessages) {
                const text = providerConfig.extractors.userText(message);
                if (text) {
                  // console.log("[AI Context Vault] Found user message:", { text });
                  await storage.addLog(chatId, {
                    type: "input",
                    content: text,
                    metadata: {
                      timestamp: new Date().toISOString(),
                      messageId: providerConfig.extractors.messageId(message),
                      provider: providerConfig.name,
                      chatId,
                    },
                  });
                }
              }

              // Look for AI responses that don't have images
              const aiMessages = node.querySelectorAll(
                providerConfig.selectors.aiMessage
              );
              for (const message of aiMessages) {
                // Skip if this message has an image
                if (message.querySelector('img[alt="Generated image"]')) {
                  continue;
                }

                // console.debug(
                //   "[AI Context Vault] Processing AI message:",
                //   message
                // );

                const messageId = providerConfig.extractors.messageId(message);
                const model = providerConfig.extractors.modelSlug(message);
                const codeBlocks2 = Array.from(message.querySelectorAll("pre"))
                  .map((pre) => {
                    const code = pre.querySelector("code");
                    const languageElem = pre.querySelector(
                      "div.flex.items-center"
                    );
                    return {
                      language: languageElem?.textContent.trim() || "text",
                      content:
                        code?.textContent.trim() ||
                        pre.textContent.trim() ||
                        "",
                    };
                  })
                  .filter((block) => block.content);

                const text = providerConfig.extractors.aiText(message);

                const logEntry = {
                  type: "output",
                  content: text || "",
                  metadata: {
                    timestamp: new Date().toISOString(),
                    messageId,
                    model,
                    provider: providerConfig.name,
                    chatId,
                  },
                };

                if (codeBlocks2.length > 0) {
                  logEntry.metadata.codeBlocks = codeBlocks2;
                }

                await storage.addLog(chatId, logEntry);
              }
            }
          }
        }
      }
    };
  }

  const observer = new MutationObserver(mutationFunc);

  if (domain === "chatgpt.com" || domain === "chat.openai.com") {
    // Configure observer to watch for all relevant changes
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [
        "data-message-id",
        "data-message-model-slug",
        "data-message-author-role",
      ],
    });
  } else if (domain === "claude.ai") {
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [
        "data-message-id",
        "data-message-model-slug",
        "data-message-author-role",
      ],
    });
  }

  return observer;
}

// Initialize God Mode
let godModeObserver = null;

// Check initial God Mode state
chrome.storage.local.get(["godModeEnabled"], async (result) => {
  if (result.godModeEnabled) {
    godModeObserver = setupGodModeObserver();
    const historyPanel = document.getElementById(
      "__ai_context_godmode_history__"
    );
    if (historyPanel) {
      historyPanel.style.display = "flex";
    }

    // Start periodic sync
    const storage = GodModeStorage.getInstance();
    await storage.startPeriodicSync();
  }
});

// Listen for God Mode state changes
chrome.storage.onChanged.addListener(async (changes) => {
  if (changes.godModeEnabled) {
    const storage = GodModeStorage.getInstance();
    if (changes.godModeEnabled.newValue) {
      godModeObserver = setupGodModeObserver();
      await storage.startPeriodicSync();
    } else {
      if (godModeObserver) {
        godModeObserver.disconnect();
        godModeObserver = null;
      }
      storage.stopPeriodicSync();
    }
  }
});

// Add watcher for chatId changes to refresh overlay
let lastChatId = null;
function watchChatIdChange() {
  setInterval(async () => {
    const { chatId } = parseUrlForIds(window.location.href);
    if (chatId !== lastChatId) {
      lastChatId = chatId;
      const overlayPanel = document.getElementById("__ai_context_overlay__");
      if (overlayPanel && overlayPanel.style.display !== "none") {
        await refreshOverlayContent(overlayPanel);
      }
    }
  }, 1000);
}
watchChatIdChange();
