////////////////////////////////////////////////////////////////////////////////
// contextStorage.js
// Now uses chrome.storage.local instead of window.localStorage
////////////////////////////////////////////////////////////////////////////////

// Track any active sync request
let currentSync = null;

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
      resolve(res[key]);
    });
  });
}

/**
 * Save context object to chrome.storage.local
 */
export async function saveContext(domain, chatId, data) {
  return new Promise((resolve) => {
    const key = getContextKey(domain, chatId);
    chrome.storage.local.set({ [key]: data }, async () => {
      await syncFullDataToGist();
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
export async function deleteContext(domain, chatId, text) {
  const ctx = await getContext(domain, chatId);
  ctx.entries = ctx.entries.filter((e) => e.text !== text);
  await saveContext(domain, chatId, ctx);
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
export async function syncFullDataToGist() {
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
    const result = await Promise.race([performGistSync(signal), timeout]);
    return result;
  } catch (err) {
    console.warn("[AI Context Vault] Sync failed:", err.message);
  } finally {
    currentSync = null;
  }
}

async function performGistSync(signal) {
  const { gistPAT, gistURL } = await new Promise((resolve) => {
    chrome.storage.local.get(["gistPAT", "gistURL"], (res) => {
      resolve({
        gistPAT: res.gistPAT || "",
        gistURL: res.gistURL || "",
      });
    });
  });

  if (!gistPAT || !gistURL.includes("/")) return;

  const gistId = gistURL.split("/").pop();
  const headers = {
    Authorization: `token ${gistPAT}`,
    "Content-Type": "application/json",
  };

  // STEP 1: Fetch remote Gist
  let remoteData = {};
  try {
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
    }
  } catch (e) {
    if (e.name !== "AbortError") throw e;
    console.warn("[AI Context Vault] Gist fetch aborted");
    return;
  }

  // STEP 2: Get local
  const localData = await gatherAllContextData();

  // STEP 3: Merge
  const merged = { ...remoteData, ...localData };

  // STEP 4: Save merged locally
  await new Promise((resolve) => {
    chrome.storage.local.set(merged, resolve);
  });

  // STEP 5: Patch Gist
  const body = {
    description: "AI Context Vault Sync",
    files: {
      "ai_context_vault_data.json": {
        content: JSON.stringify(merged, null, 2),
      },
    },
  };

  try {
    const patch = await fetch(`https://api.github.com/gists/${gistId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(body),
      signal,
    });

    if (!patch.ok) {
      const err = await patch.json();
      console.error("[AI Context Vault] Gist update failed", err);
    } else {
      console.log("[AI Context Vault] Gist sync complete");
    }
  } catch (err) {
    if (err.name !== "AbortError") throw err;
    console.warn("[AI Context Vault] Patch aborted");
  }
}
