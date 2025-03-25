// ui-overlay.js
// A floating React overlay for editing context
// If you prefer vanilla JS, skip React here. This is a minimal example.

import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  parseUrlForIds,
  getContext,
  saveContext,
  toggleContext,
  deleteContext,
  updateSummary,
} from "../storage/contextStorage";

// Dark mode styles
const styles = {
  overlay: {
    position: "fixed",
    top: 50,
    right: 50,
    width: 300,
    height: 400,
    background: "#1e1e1e",
    border: "1px solid #444",
    padding: 10,
    zIndex: 999999,
    overflow: "auto",
    color: "#e0e0e0",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
    borderRadius: "8px",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    display: "none",
  },
  header: {
    color: "#7aa2d4",
    marginTop: 0,
    marginBottom: 12,
    borderBottom: "1px solid #333",
    paddingBottom: 8,
  },
  label: {
    color: "#e0e0e0",
    display: "block",
    marginBottom: 4,
    fontSize: 14,
  },
  textarea: {
    width: "100%",
    height: "60px",
    background: "#2d2d2d",
    color: "#e0e0e0",
    border: "1px solid #444",
    borderRadius: 4,
    padding: 6,
    marginBottom: 10,
    resize: "vertical",
  },
  divider: {
    margin: "10px 0",
    border: 0,
    borderTop: "1px solid #444",
  },
  entryContainer: {
    marginBottom: 8,
    padding: 6,
    borderRadius: 4,
    background: "#252525",
  },
  entryText: {
    marginLeft: 8,
    fontSize: 14,
  },
  checkbox: {
    accentColor: "#7aa2d4",
  },
  button: {
    marginLeft: 8,
    background: "#333",
    color: "#e0e0e0",
    border: "1px solid #444",
    borderRadius: 4,
    padding: "3px 6px",
    cursor: "pointer",
    fontSize: 12,
  },
  deleteButton: {
    background: "#3f2a2a",
    color: "#e0e0e0",
    border: "1px solid #5a3939",
    borderRadius: 4,
    padding: "3px 6px",
    cursor: "pointer",
    fontSize: 12,
    marginLeft: 8,
  },
  emptyMessage: {
    color: "#999",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 20,
  },
};

// Basic overlay component
function Overlay() {
  const { domain, chatId } = parseUrlForIds(window.location.href);
  const [contextData, setContextData] = useState(null);
  const [summary, setSummary] = useState("");

  // Function to load/refresh context data
  const loadContextData = () => {
    const data = getContext(domain, chatId);
    setContextData(data);
    setSummary(data.summary || "");
  };

  // Initial load of context data
  useEffect(() => {
    loadContextData();

    // Listen for context updates from other parts of the extension
    const handleContextUpdate = (event) => {
      // Only refresh if the updated context matches our current domain/chatId
      if (event.detail.domain === domain && event.detail.chatId === chatId) {
        loadContextData();
      }
    };

    document.addEventListener("ai-context-updated", handleContextUpdate);

    // Clean up the event listener when component unmounts
    return () => {
      document.removeEventListener("ai-context-updated", handleContextUpdate);
    };
  }, [domain, chatId]);

  const handleToggle = (entryId) => {
    toggleContext(domain, chatId, entryId);
    const updated = getContext(domain, chatId);
    setContextData(updated);
  };

  const handleDelete = (text) => {
    deleteContext(domain, chatId, text);
    const updated = getContext(domain, chatId);
    setContextData(updated);
  };

  const handleSummarySave = () => {
    updateSummary(domain, chatId, summary);
  };

  if (!contextData) return null;

  return (
    <div style={styles.overlay} id="__ai_context_overlay__">
      <h3 style={styles.header}>AI Context Vault</h3>
      <div>
        <label style={styles.label}>Summary:</label>
        <textarea
          style={styles.textarea}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          onBlur={handleSummarySave}
        />
      </div>
      <hr style={styles.divider} />
      {contextData.entries.length === 0 ? (
        <p style={styles.emptyMessage}>No saved entries yet.</p>
      ) : (
        contextData.entries.map((entry) => (
          <div key={entry.id} style={styles.entryContainer}>
            <input
              type="checkbox"
              checked={entry.active}
              onChange={() => handleToggle(entry.id)}
              style={styles.checkbox}
            />
            <span style={styles.entryText}>{entry.text}</span>
            <button
              style={styles.deleteButton}
              onClick={() => handleDelete(entry.text)}
            >
              Delete
            </button>
          </div>
        ))
      )}
    </div>
  );
}

// Mount the overlay if not already present
(function initOverlay() {
  console.log("[AI Context Vault] Initializing overlay...");

  let container = document.getElementById("__ai_context_overlay_container__");
  if (!container) {
    console.log("[AI Context Vault] Creating overlay container");
    container = document.createElement("div");
    container.id = "__ai_context_overlay_container__";
    document.body.appendChild(container);
  } else {
    console.log("[AI Context Vault] Overlay container already exists");
  }

  try {
    console.log("[AI Context Vault] Rendering overlay component");
    createRoot(container).render(<Overlay />);
    console.log("[AI Context Vault] Overlay rendered successfully");

    // Verify the overlay element was created
    setTimeout(() => {
      const overlayElement = document.getElementById("__ai_context_overlay__");
      if (overlayElement) {
        console.log(
          "[AI Context Vault] Overlay element exists with ID: __ai_context_overlay__"
        );
      } else {
        console.error(
          "[AI Context Vault] Overlay element not found after rendering!"
        );
      }
    }, 100);
  } catch (error) {
    console.error("[AI Context Vault] Error rendering overlay:", error);
  }
})();
