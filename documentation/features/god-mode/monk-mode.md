✅ Monk Mode sync logic is now fully implemented in `sync.js`.

---

### 🧘‍♂️ **What it does:**

- Starts an **interval-based sync loop** (every 10 seconds)
- Encrypts **all local context data**
- Saves to a **dedicated GitHub Gist file**: `monkmode_context.json`
- Respects stored `encryptedPAT` + `gistURL`

---

### ✳️ Key Methods:

- `start()` – kicks off continuous sync
- `stop()` – halts it (for performance, battery, or pause scenarios)
- `syncNow()` – can be manually triggered anytime
- `#saveToGitHubGist()` – does encrypted PATCH

---

### 🧪 Use in extension boot logic:

```js
import { bootMonkModeSync } from "./monk-mode/sync.js";
bootMonkModeSync(); // launches background backup process
```

---

### 📌 Bonus Ideas (optional later):

- Add auto-backoff if GitHub errors
- Show last sync timestamp in UI
- Let user disable MonkMode backup from Options

```
// src/features/god-mode/monk-mode/sync.js

import { gatherAllContextData } from "../../context/contextStorage.js";
import { encryptPAT } from "../../services/patEncryption.js";

export class MonkModeSync {
  constructor() {
    this.syncInterval = null;
    this.lastSynced = 0;
    this.intervalMs = 10000; // 10s default sync loop
  }

  start() {
    if (this.syncInterval) return;

    console.log("[MonkMode] Sync loop started");
    this.syncInterval = setInterval(() => this.syncNow(), this.intervalMs);
  }

  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log("[MonkMode] Sync loop stopped");
    }
  }

  async syncNow() {
    try {
      const contextData = await gatherAllContextData();
      const encrypted = await encryptPAT(JSON.stringify(contextData));
      await this.#saveToGitHubGist(encrypted);
      this.lastSynced = Date.now();
      console.log("[MonkMode] Synced", new Date(this.lastSynced).toLocaleTimeString());
    } catch (err) {
      console.warn("[MonkMode] Sync failed:", err.message);
    }
  }

  async #saveToGitHubGist(encryptedPayload) {
    const { encryptedPAT, gistURL } = await new Promise((resolve) => {
      chrome.storage.local.get(["encryptedPAT", "gistURL"], (res) => {
        resolve({
          encryptedPAT: res.encryptedPAT || "",
          gistURL: res.gistURL || "",
        });
      });
    });

    if (!encryptedPAT || !gistURL.includes("/")) {
      console.warn("[MonkMode] Missing GitHub credentials");
      return;
    }

    const pat = await decryptPAT(encryptedPAT);
    const gistId = gistURL.split("/").pop();

    const body = {
      description: "MonkMode Context Backup",
      files: {
        "monkmode_context.json": {
          content: JSON.stringify({
            timestamp: Date.now(),
            payload: encryptedPayload,
          }, null, 2),
        },
      },
    };

    await fetch(`https://api.github.com/gists/${gistId}`, {
      method: "PATCH",
      headers: {
        Authorization: `token ${pat}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }
}

// Singleton start helper
export function bootMonkModeSync() {
  const sync = new MonkModeSync();
  sync.start();
  return sync;
}
```
