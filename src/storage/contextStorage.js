////////////////////////////////////////////////////////////////////////////////
// contextStorage.js
// Now uses chrome.storage.local instead of window.localStorage
////////////////////////////////////////////////////////////////////////////////

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
 * 1) If gistURL & gistPAT exist, fetch Gist contents.
 * 2) Merge with local data from chrome.storage.local.
 * 3) Overwrite Gist with the merged result (PATCH).
 * 4) Overwrite local extension storage with merged result, so we maintain one version.
 */
export async function syncFullDataToGist() {
  // 0) Get gist info
  const { gistPAT, gistURL } = await new Promise((resolve) => {
    chrome.storage.local.get(["gistPAT", "gistURL"], (res) => {
      resolve({
        gistPAT: res.gistPAT || "",
        gistURL: res.gistURL || "",
      });
    });
  });
  if (!gistPAT || gistPAT.length < 10) {
    console.log("[AI Context Vault] No valid PAT or Gist. Skipping sync.");
    return; // user hasn’t set up sync
  }
  if (!gistURL.includes("/")) {
    console.log("[AI Context Vault] gistURL not set. Skipping sync.");
    return;
  }

  // 1) Extract Gist ID from gistURL
  const gistId = gistURL.split("/").pop();
  if (!gistId) {
    console.log("[AI Context Vault] Could not parse gistId from URL:", gistURL);
    return;
  }

  // 2) Retrieve Gist from GitHub
  let remoteData = {};
  try {
    const resp = await fetch(`https://api.github.com/gists/${gistId}`, {
      method: "GET",
      headers: {
        Authorization: `token ${gistPAT}`,
        "Content-Type": "application/json",
      },
    });
    if (!resp.ok) {
      const errData = await resp.json();
      console.warn("[AI Context Vault] Failed fetching gist:", errData);
      return;
    }
    const gistInfo = await resp.json();
    // We assume your context is in "ai_context_vault_data.json"
    if (
      gistInfo.files &&
      gistInfo.files["ai_context_vault_data.json"] &&
      gistInfo.files["ai_context_vault_data.json"].content
    ) {
      remoteData = JSON.parse(
        gistInfo.files["ai_context_vault_data.json"].content
      );
    }
  } catch (err) {
    console.error("[AI Context Vault] Error fetching gist data:", err);
    return;
  }

  // 3) Grab local data
  const localData = await gatherAllContextData(); // keys => { chat data }

  // 4) Merge remote -> local -> final. Naive approach: local overwrites remote.
  // If you wanted two-way merges, you'd do more logic here.
  const merged = { ...remoteData, ...localData };

  // 5) Overwrite local extension storage with merged result
  // (clear out the old data and re-insert)
  await new Promise((resolve) => {
    chrome.storage.local.get(null, async (allItems) => {
      // Remove all old domain-based keys
      const removals = [];
      for (const k of Object.keys(allItems)) {
        if (k.startsWith("ctx_")) {
          removals.push(k);
        }
      }
      if (removals.length > 0) {
        await new Promise((res2) =>
          chrome.storage.local.remove(removals, res2)
        );
      }
      // Now set the merged data
      const toSet = {};
      for (const key of Object.keys(merged)) {
        toSet[key] = merged[key];
      }
      chrome.storage.local.set(toSet, () => {
        resolve();
      });
    });
  });

  // 6) Overwrite Gist with merged data
  const gistPayload = {
    description: "AI Context Vault Sync",
    files: {
      "ai_context_vault_data.json": {
        content: JSON.stringify(merged, null, 2),
      },
    },
  };
  try {
    const patchResp = await fetch(`https://api.github.com/gists/${gistId}`, {
      method: "PATCH",
      headers: {
        Authorization: `token ${gistPAT}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(gistPayload),
    });
    if (!patchResp.ok) {
      const errPatch = await patchResp.json();
      console.error(
        "[AI Context Vault] Error patching gist with merged data:",
        errPatch
      );
      return;
    }
    console.log(
      "[AI Context Vault] Successfully patched gist with merged data"
    );
  } catch (err) {
    console.error("[AI Context Vault] Error patching gist data:", err);
  }
}
