---

## 🧠 Core Logic: `DeletedMessageTracker`

### What it does:
- Uses your `PlatformAdapter` (ChatGPT or Claude)
- Scans live DOM containers for deletions
- Caches last-seen content in memory (`previousSnapshot`)
- Appends any confirmed deletions to `context.deletedMessages`
- Stores:
  - `id`
  - `deletedAt` timestamp
  - `originalContent` from snapshot

### How to run:
```js
import { startDeletionMonitor } from "./recovery/deletion-tracker.js";
startDeletionMonitor();
```

It will check every 3 seconds and log deleted message IDs to console — which can be rendered in your viewer.

---

## 📦 Saved Format (`ctx_{domain}_{chatId}`)

```json
{
  "deletedMessages": [
    {
      "id": "some_unique_id",
      "deletedAt": 1713450987342,
      "originalContent": "What was removed"
    }
  ]
}
```

---

## 🧼 Next Steps (UI Recovery Tools)

You probably want to:

1. 🧾 Add a toggle in `oracle-viewer` to show deleted messages
2. ♻️ Create a **Restore** button to reactivate as context
3. ✍️ Add a `recoverDeletedMessage(id)` util that:
   - Moves the entry from `deletedMessages` → `entries[]`
   - Logs it with a timestamp (`recovered: true`)
   - Allows modifying label before injection

```
// src/features/god-mode/recovery/deletion-tracker.js

import { getAdapterForPlatform } from "../../platforms/adapters.js";
import { getContext, saveContext } from "../../context/contextStorage.js";

export class DeletedMessageTracker {
  constructor() {
    this.adapter = getAdapterForPlatform();
    this.previousSnapshot = new Map();
  }

  async scanAndTrackDeletions() {
    const containers = this.adapter.identifyMessageContainers();
    const { domain, chatId } = this.adapter.getMessageMetadata(containers[0] || {});

    const context = await getContext(domain, chatId);
    const deleted = [];

    containers.forEach((container) => {
      const content = this.adapter.extractMessageContent(container);
      const id = this.#getContainerId(container);

      if (this.adapter.detectDeletion(container)) {
        if (!context.deletedMessages) context.deletedMessages = [];

        const alreadyStored = context.deletedMessages.some((m) => m.id === id);
        if (!alreadyStored) {
          context.deletedMessages.push({
            id,
            deletedAt: Date.now(),
            originalContent: this.previousSnapshot.get(id) || "[unknown]",
          });
          deleted.push(id);
        }
      } else {
        // Update snapshot map to reflect most recent content
        this.previousSnapshot.set(id, content);
      }
    });

    if (deleted.length > 0) {
      await saveContext(domain, chatId, context);
      console.log("[GodMode] Detected deletions:", deleted);
    }
  }

  #getContainerId(container) {
    // Fallback method - should be replaced with real tracking ID if available
    return container.dataset.messageId || container.innerText.slice(0, 30).replace(/\W+/g, "_");
  }
}

// Set an interval to run the scanner every few seconds
export function startDeletionMonitor() {
  const tracker = new DeletedMessageTracker();
  setInterval(() => tracker.scanAndTrackDeletions(), 3000);
}
```
