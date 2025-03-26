// contextStorage.js
// Simple localStorage-based approach for storing context entries by domain/chatId

export function getContextKey(domain, chatId) {
  // e.g. domain=chat.openai.com, chatId=abc123
  // -> "ctx_chat.openai.com_abc123"
  return `ctx_${domain}_${chatId}`;
}

export function parseUrlForIds(url) {
  try {
    const u = new URL(url);
    const domain = u.hostname;
    // For ChatGPT, chatId often in path or hash
    // For simplicity, attempt a naive parse:
    const chatId = u.pathname.split("/").pop() || "default";
    return { domain, chatId };
  } catch (err) {
    return { domain: "unknown", chatId: "default" };
  }
}

// Retrieve context object from localStorage
export function getContext(domain, chatId) {
  const key = getContextKey(domain, chatId);
  const raw = localStorage.getItem(key);
  if (!raw) {
    return { chatId, summary: "", entries: [] };
  }
  return JSON.parse(raw);
}

// Save context object to localStorage
export function saveContext(domain, chatId, data) {
  const key = getContextKey(domain, chatId);
  localStorage.setItem(key, JSON.stringify(data));
}

// Add a context entry
export function addContext(domain, chatId, text) {
  const ctx = getContext(domain, chatId);
  // Simple dedup check
  if (!ctx.entries.some((e) => e.text === text)) {
    ctx.entries.push({
      id: `entry_${Date.now()}`,
      text,
      active: true,
      created: Date.now(),
      lastModified: Date.now(),
    });
  }
  saveContext(domain, chatId, ctx);
  return ctx;
}

// Delete a context entry (by text match for simplicity)
export function deleteContext(domain, chatId, text) {
  const ctx = getContext(domain, chatId);
  ctx.entries = ctx.entries.filter((e) => e.text !== text);
  saveContext(domain, chatId, ctx);
  return ctx;
}

// Toggle a context entry's active status
export function toggleContext(domain, chatId, entryId) {
  const ctx = getContext(domain, chatId);
  const entry = ctx.entries.find((e) => e.id === entryId);
  if (entry) {
    entry.active = !entry.active;
    saveContext(domain, chatId, ctx);
  }
  return ctx;
}

// Update summary
export function updateSummary(domain, chatId, summary) {
  const ctx = getContext(domain, chatId);
  ctx.summary = summary;
  saveContext(domain, chatId, ctx);
  return ctx;
}

// Update an existing context entry
export async function updateContext(domain, chatId, oldText, newText) {
  try {
    const ctx = getContext(domain, chatId);

    // Find and update the entry
    const entryIndex = ctx.entries.findIndex((entry) => entry.text === oldText);

    if (entryIndex !== -1) {
      // Update the entry text and timestamp
      ctx.entries[entryIndex].text = newText;
      ctx.entries[entryIndex].lastModified = Date.now();

      // Save back to storage using our saveContext function
      saveContext(domain, chatId, ctx);

      console.log("[AI Context Vault] Updated context entry");
      return true;
    } else {
      console.error("[AI Context Vault] Context entry not found");
      return false;
    }
  } catch (error) {
    console.error("[AI Context Vault] Error updating context:", error);
    throw error;
  }
}
