////////////////////////////////////////////////////////////////////////////////
// contextStorage.js
// Now uses chrome.storage.local instead of window.localStorage
////////////////////////////////////////////////////////////////////////////////

import { decryptPAT } from "../services/patEncryption";

// Track any active sync request
let currentSync = null;
let lastKnownSha = null;
let checkInterval = null;
let runningSync = null;
let lastUrl = window.location.href;
let refreshTimeout = null;

// Start checks immediately when the script loads
startPeriodicChecks();

// Watch for URL changes
function setupUrlChangeListener() {
  function handleUrlChange() {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      const { domain, chatId } = parseUrlForIds(window.location.href);

      // Clear any pending refresh
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }

      // Debounce the refresh
      refreshTimeout = setTimeout(() => {
        document.dispatchEvent(
          new CustomEvent("ai-context-refresh-requested", {
            detail: { domain, chatId, forceRefresh: true },
          })
        );
      }, 100); // 100ms debounce
    }
  }

  // Listen for browser navigation
  window.addEventListener("popstate", handleUrlChange);

  // Watch for URL changes in single-page apps
  const observer = new MutationObserver(handleUrlChange);
  observer.observe(document, { subtree: true, childList: true });
}

setupUrlChangeListener();

export function getContextKey(domain, chatId) {
  // e.g. domain=chat.openai.com, chatId=abc123
  // -> "ctx_chat.openai.com_abc123"
  return `ctx_${domain}_${chatId}`;
}

export function parseUrlForIds(url) {
  try {
    const u = new URL(url);
    const domain = u.hostname;

    // Handle /g/{project-id}/project pattern
    const pathParts = u.pathname.split("/").filter(Boolean);
    if (
      pathParts[0] === "g" &&
      pathParts.length >= 3 &&
      pathParts[2] === "project"
    ) {
      const chatId = `${pathParts[1]}/project`; // e.g. g-p-xyz/project
      return { domain, chatId };
    }

    // Fallback: use last segment
    const chatId = pathParts[pathParts.length - 1] || "default";
    return { domain, chatId };
  } catch (err) {
    return { domain: "unknown", chatId: "default" };
  }
}

/**
 * Retrieve context object from chrome.storage.local
 */
export async function getContext(domain, chatId) {
  return new Promise((resolve) => {
    const key = getContextKey(domain, chatId);
    chrome.storage.local.get([key], (res) => {
      if (!res[key]) {
        return resolve({ chatId, summary: "", entries: [] });
      }

      // Ensure entries is an array
      const context = res[key];
      if (!Array.isArray(context.entries)) {
        context.entries = [];
      }

      resolve(context);
    });
  });
}

/**
 * Save context object to chrome.storage.local
 */
export async function saveContext(
  domain,
  chatId,
  data,
  shouldSync = true,
  deleteKey = ""
) {
  return new Promise((resolve) => {
    const key = getContextKey(domain, chatId);
    chrome.storage.local.set({ [key]: data }, async () => {
      if (shouldSync) {
        await syncFullDataToGist(deleteKey);
      }
      resolve();
    });
  });
}

/**
 * Save context object to chrome.storage.local
 */
export async function saveBookmark(
  domain,
  chatId,
  data,
  shouldSync = true,
  deleteKey = ""
) {
  return new Promise((resolve) => {
    const key = getBookmarkKey(domain, chatId);
    chrome.storage.local.set({ [key]: data }, async () => {
      if (shouldSync) {
        await syncFullDataToGist(deleteKey);
      }
      resolve();
    });
  });
}

/**
 * Add a context entry
 */
export async function addContext(domain, chatId, text) {
  const ctx = await getContext(domain, chatId);
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
  await saveContext(domain, chatId, ctx);
  return ctx;
}

/**
 * Delete a context entry (by text match for simplicity)
 */
export async function deleteContext(domain, chatId, id) {
  const ctx = await getContext(domain, chatId);
  ctx.entries = ctx.entries.filter((e) => e.id !== id);
  await saveContext(domain, chatId, ctx, true, id);
  return ctx;
}

/**
 * Toggle a context entry's active status
 */
export async function toggleContext(domain, chatId, entryId) {
  const ctx = await getContext(domain, chatId);
  const entry = ctx.entries.find((e) => e.id === entryId);
  if (entry) {
    entry.active = !entry.active;
  }
  await saveContext(domain, chatId, ctx);
  return ctx;
}

/**
 * Update summary
 */
export async function updateSummary(domain, chatId, summary) {
  const ctx = await getContext(domain, chatId);
  ctx.summary = summary;
  await saveContext(domain, chatId, ctx);
  return ctx;
}

/**
 * Update an existing context entry
 */
export async function updateContext(domain, chatId, oldText, newText) {
  const ctx = await getContext(domain, chatId);
  const entryIndex = ctx.entries.findIndex((entry) => entry.text === oldText);

  if (entryIndex !== -1) {
    ctx.entries[entryIndex].text = newText;
    ctx.entries[entryIndex].lastModified = Date.now();
    await saveContext(domain, chatId, ctx);
    console.log("[AI Context Vault] Updated context entry");
    return true;
  } else {
    console.error("[AI Context Vault] Context entry not found");
    return false;
  }
}

////////////////////////////////////////////////////////////////////////////////
// GATHER ALL CONTEXT DATA FROM chrome.storage.local
////////////////////////////////////////////////////////////////////////////////

/**
 * gatherAllContextData
 * Scans chrome.storage.local for keys like "ctx_{domain}_{chatId}"
 * Returns an object containing all context entries for each domain/chat.
 */
export async function gatherAllContextData() {
  return new Promise((resolve) => {
    chrome.storage.local.get(null, (storage) => {
      const allData = {};
      for (const key in storage) {
        if (key.startsWith("ctx_")) {
          allData[key] = storage[key];
        }
      }
      resolve(allData);
    });
  });
}

////////////////////////////////////////////////////////////////////////////////
// FULL SYNC ON EVERY CHANGE - ADDED AT THE BOTTOM
////////////////////////////////////////////////////////////////////////////////
/**
 * syncFullDataToGist
 * - Cancels any in-flight sync request
 * - Merges remote and local data
 * - Syncs both directions with timeout and conflict resilience
 */
export async function syncFullDataToGist(
  deleteKey = "",
  syncOnlyServer = false
) {
  // Abort any in-flight request
  if (currentSync && currentSync.abort) {
    console.log("[AI Context Vault] Aborting previous sync");
    currentSync.abort(); // cancel previous request
  }

  const controller = new AbortController();
  const signal = controller.signal;
  currentSync = controller;

  // Set up a 20-second timeout
  const timeout = new Promise((_, reject) =>
    setTimeout(() => {
      controller.abort();
      reject(new Error("GitHub sync timed out"));
    }, 20000)
  );

  try {
    const result = await Promise.race([
      performGistSync(signal, deleteKey, syncOnlyServer),
      timeout,
    ]);
    return result;
  } catch (err) {
    console.error(
      "[AI Context Vault] Sync failed:",
      err.message,
      "\nStack:",
      err.stack,
      "\nAt line:",
      err.stack?.split("\n")[1]?.match(/:(\\d+):/)?.[1] || "unknown"
    );
  } finally {
    currentSync = null;
  }
}

/**
 * Get the current SHA of the Gist file
 */
async function getGistSha() {
  const { encryptedPAT, gistURL } = await new Promise((resolve) => {
    chrome.storage.local.get(["encryptedPAT", "gistURL"], (res) => {
      resolve({
        encryptedPAT: res.encryptedPAT || "",
        gistURL: res.gistURL || "",
      });
    });
  });

  if (!encryptedPAT || !gistURL.includes("/")) {
    return null;
  }

  try {
    const pat = await decryptPAT(encryptedPAT);
    const gistId = gistURL.split("/").pop();
    const headers = {
      Authorization: `token ${pat}`,
    };

    const response = await fetch(`https://api.github.com/gists/${gistId}`, {
      method: "HEAD",
      headers,
    });

    if (response.ok) {
      return response.headers.get("etag")?.replace(/"/g, "");
    }
  } catch (error) {
    console.debug("[AI Context Vault] Failed to get Gist SHA:", error);
  }
  return null;
}

/**
 * Check if the Gist has been updated
 */
async function checkGistUpdates() {
  // Skip if we're already running a sync
  if (runningSync) {
    console.debug(
      "[AI Context Vault] Sync already in progress, skipping check"
    );
    return;
  }

  const currentSha = await getGistSha();
  console.debug(lastKnownSha, currentSha);
  if (currentSha && currentSha !== lastKnownSha && lastKnownSha !== -1) {
    console.debug("[AI Context Vault] Gist updated, triggering sync");
    runningSync = true; // Set sync lock
    try {
      await syncFullDataToGist("", true);

      // Get current domain and chatId from URL
      const { domain, chatId } = parseUrlForIds(window.location.href);

      // Dispatch a custom event to refresh the overlay with domain and chatId
      document.dispatchEvent(
        new CustomEvent("ai-context-refresh-requested", {
          detail: { domain, chatId, forceRefresh: true },
        })
      );
    } finally {
      runningSync = null; // Release sync lock
    }
  }
}

/**
 * Start periodic checks for Gist updates
 */
export async function startPeriodicChecks() {
  if (checkInterval) return;

  // Check if Gist configuration exists
  const { encryptedPAT, gistURL } = await new Promise((resolve) => {
    chrome.storage.local.get(["encryptedPAT", "gistURL"], (res) => {
      resolve({
        encryptedPAT: res.encryptedPAT || "",
        gistURL: res.gistURL || "",
      });
    });
  });

  if (!encryptedPAT || !gistURL.includes("/")) {
    console.debug(
      "[AI Context Vault] Missing Gist configuration, skipping periodic checks"
    );
    return;
  }

  // Check every 20 seconds
  checkInterval = setInterval(checkGistUpdates, 20000);

  // Listen for visibility changes
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      checkGistUpdates();
    }
  });

  // Listen for window focus changes
  window.addEventListener("focus", () => {
    checkGistUpdates();
  });

  // Listen for window focus changes
  window.addEventListener("blur", () => {
    stopPeriodicChecks();
  });
}

/**
 * Stop periodic checks
 */
function stopPeriodicChecks() {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
  document.removeEventListener("visibilitychange", checkGistUpdates);
  window.removeEventListener("focus", checkGistUpdates);
}

async function performGistSync(signal, deleteKey, syncOnlyServer = false) {
  try {
    const { encryptedPAT, gistURL } = await new Promise((resolve) => {
      chrome.storage.local.get(["encryptedPAT", "gistURL"], (res) => {
        resolve({
          encryptedPAT: res.encryptedPAT || "",
          gistURL: res.gistURL || "",
        });
      });
    });

    if (!encryptedPAT || !gistURL.includes("/")) {
      console.warn("[AI Context Vault] Missing Gist configuration");
      return;
    }

    const pat = await decryptPAT(encryptedPAT);
    const gistId = gistURL.split("/").pop();
    const headers = {
      Authorization: `token ${pat}`,
      "Content-Type": "application/json",
    };

    // Get local data first
    const localData = await gatherAllContextData();
    console.debug("[AI Context Vault] Local data:", localData);

    // Get remote data
    let remoteData = {};
    const response = await fetch(`https://api.github.com/gists/${gistId}`, {
      method: "GET",
      headers,
      signal,
    });

    if (response.ok) {
      const gist = await response.json();
      const file = gist.files["ai_context_vault_data.json"];
      if (file && file.content) {
        remoteData = JSON.parse(file.content);
      }
    } else {
      lastKnownSha = -1;
    }

    // Merge the data
    const merged = {};

    // First, add all remote data
    for (const key in remoteData) {
      if (Array.isArray(remoteData[key])) {
        // Handle bookmark arrays
        remoteData[key] = remoteData[key].filter(
          (entry) => entry.id !== deleteKey
        );
      } else if (
        remoteData[key]?.entries &&
        Array.isArray(remoteData[key].entries)
      ) {
        // Handle context objects with entries array
        remoteData[key].entries = remoteData[key].entries.filter(
          (entry) => entry.id !== deleteKey
        );
      }
      merged[key] = remoteData[key];
    }

    console.debug(
      "[AI Context Vault] syncOnlyServer data:",
      syncOnlyServer,
      localData
    );
    if (!syncOnlyServer) {
      // Then merge in local data
      for (const key in localData) {
        if (!key.startsWith("ctx_")) continue;

        const localCtx = localData[key];
        const remoteCtx = merged[key];

        if (!remoteCtx) {
          merged[key] = localCtx;
        } else {
          // Handle context entries
          // if (
          //   localCtx &&
          //   typeof localCtx === "object" &&
          //   Array.isArray(localCtx.entries)
          // ) {
          // If remote has no entries, keep local data
          if (
            !Array.isArray(remoteCtx?.entries) ||
            remoteCtx.entries.length === 0
          ) {
            merged[key] = localCtx;
            continue;
          }

          const mergedEntries = [...remoteCtx.entries];

          localCtx.entries.forEach((localEntry) => {
            const matchIndex = mergedEntries.findIndex(
              (e) => e.id === localEntry.id || e.text === localEntry.text
            );
            if (matchIndex === -1) {
              mergedEntries.push(localEntry);
            } else {
              mergedEntries[matchIndex] = localEntry;
            }
          });

          merged[key] = {
            ...localCtx,
            entries: mergedEntries,
            summary: localCtx.summary || remoteCtx?.summary || "",
          };
          // }
        }
      }
    }
    // Save merged data back to local storage
    await chrome.storage.local.set(merged);

    // Update GitHub
    const body = {
      description: "AI Context Vault Sync",
      files: {
        "ai_context_vault_data.json": {
          content: JSON.stringify(merged, null, 2),
        },
      },
    };

    const patch = await fetch(`https://api.github.com/gists/${gistId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(body),
      signal,
    });

    if (!patch.ok) {
      throw new Error(`Gist update failed: ${await patch.text()}`);
    }

    const currentSha = await getGistSha();
    // Update last known SHA
    lastKnownSha = currentSha.replace(/"/g, "");
    return merged;
  } catch (error) {
    if (error.name === "AbortError") {
      console.warn("[AI Context Vault] Sync aborted");
      return;
    }

    console.error(
      "[AI Context Vault] Sync failed at line",
      error.stack?.split("\n")[1]?.match(/:(\\d+):/)?.[1] || "unknown",
      "\nError:",
      error.message,
      "\nStack:",
      error.stack
    );
    throw error; // Re-throw to be caught by the outer try-catch
  }
}

/**
 * Get all bookmark entries for this domain/chatId pair.
 */
export async function getBookmarks(domain, chatId) {
  const key = getBookmarkKey(domain, chatId);
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (res) => {
      resolve(res[key] || []);
    });
  });
}

export function getBookmarkKey(domain, chatId) {
  return `ctx_bookmarks_${domain}_${chatId}`;
}

/**
 * Add a new bookmark.
 */
export async function addBookmark(
  domain,
  chatId,
  label,
  selector,
  fallbackText
) {
  const newBookmark = {
    id: `bm_${Date.now()}`,
    label,
    domain,
    chatId,
    selector,
    fallbackText,
    created: Date.now(),
    lastModified: Date.now(),
  };

  const bookmarks = await getBookmarks(domain, chatId);
  bookmarks.push(newBookmark);
  await saveBookmark(domain, chatId, bookmarks);
}

export async function updateBookmarkLabel(
  domain,
  chatId,
  bookmarkId,
  newLabel
) {
  const bookmarks = await getBookmarks(domain, chatId);
  const index = bookmarks.findIndex((b) => b.id === bookmarkId);
  if (index !== -1) {
    bookmarks[index].label = newLabel;
    bookmarks[index].lastModified = Date.now();
    await saveBookmark(domain, chatId, bookmarks);
  }
}

/**
 * Delete a bookmark by its ID.
 */
export async function deleteBookmark(domain, chatId, bookmarkId) {
  const current = await getBookmarks(domain, chatId);
  const updated = current.filter((entry) => entry.id !== bookmarkId);
  await saveBookmark(domain, chatId, updated, true, bookmarkId);
  return updated;
}

/**
 * Gather all bookmark sets across all domains and chat IDs.
 */
export async function gatherAllBookmarks() {
  return new Promise((resolve) => {
    chrome.storage.local.get(null, (items) => {
      const all = {};
      for (const key in items) {
        if (key.startsWith("ctx_bookmarks_")) {
          all[key] = items[key];
        }
      }
      resolve(all);
    });
  });
}

// Persist last selected category and subcategory
export async function saveLastTopicSelection(category, subcategory) {
  return new Promise((resolve) => {
    chrome.storage.local.set(
      { ctx_topic_cats: { category, subcategory } },
      resolve
    );
  });
}

export async function getLastTopicSelection() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["ctx_topic_cats"], (res) => {
      resolve(res.ctx_topic_cats || { category: null, subcategory: null });
    });
  });
}

// Persist visited topic strings (topic.topic)
export async function addVisitedTopic(topicString) {
  return new Promise((resolve) => {
    chrome.storage.local.get(["ctx_topic_visited"], (res) => {
      const visited = new Set(res.ctx_topic_visited || []);
      visited.add(topicString);
      chrome.storage.local.set(
        { ctx_topic_visited: Array.from(visited) },
        resolve
      );
    });
  });
}

export async function getVisitedTopics() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["ctx_topic_visited"], (res) => {
      resolve(res.ctx_topic_visited || []);
    });
  });
}

// Persist visited categories (category names)
export async function addVisitedCategory(category) {
  return new Promise((resolve) => {
    chrome.storage.local.get(["ctx_topic_visited_categories"], (res) => {
      const visited = new Set(res.ctx_topic_visited_categories || []);
      visited.add(category);
      chrome.storage.local.set(
        { ctx_topic_visited_categories: Array.from(visited) },
        resolve
      );
    });
  });
}

export async function getVisitedCategories() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["ctx_topic_visited_categories"], (res) => {
      resolve(res.ctx_topic_visited_categories || []);
    });
  });
}

// Persist visited subcategories (category|subcategory key)
export async function addVisitedSubcategory(category, subcategory) {
  const key = `${category}|${subcategory}`;
  return new Promise((resolve) => {
    chrome.storage.local.get(["ctx_topic_visited_subcategories"], (res) => {
      const visited = new Set(res.ctx_topic_visited_subcategories || []);
      visited.add(key);
      chrome.storage.local.set(
        { ctx_topic_visited_subcategories: Array.from(visited) },
        resolve
      );
    });
  });
}

export async function getVisitedSubcategories() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["ctx_topic_visited_subcategories"], (res) => {
      resolve(res.ctx_topic_visited_subcategories || []);
    });
  });
}
