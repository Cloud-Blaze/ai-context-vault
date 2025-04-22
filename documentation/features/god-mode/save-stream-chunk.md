### ✅ Replace `saveStreamChunk()` with full `context-aware + encrypted worker-safe` version

```js
import { encryptPAT } from "../services/patEncryption.js";
import { getContext, saveContext, getContextKey } from "./contextStorage.js";

async function saveStreamChunk(domain, chatId, buffer) {
  const key = getContextKey(domain, chatId);
  const context = await getContext(domain, chatId);

  const exists = context.entries.find((e) => e.id === buffer.messageId);

  const newEntry = {
    id: buffer.messageId,
    text: buffer.content,
    active: true,
    type: "streamed",
    created: exists ? exists.created : buffer.timestamp,
    lastModified: Date.now(),
    isStreamed: true,
  };

  if (exists) {
    Object.assign(exists, newEntry); // update in-place
  } else {
    context.entries.push(newEntry);
  }

  // Optional: trim old entries if above size limit
  while (context.entries.length > 2000) {
    context.entries.shift();
  }

  // 🔐 Encrypt buffer before syncing (if syncing later)
  if (context.shouldEncrypt || context.entries.length % 5 === 0) {
    try {
      const { encrypted } = await encryptPAT(JSON.stringify(context));
      context.encryptedSnapshot = encrypted;
    } catch (err) {
      console.warn("[GodMode] Encryption error:", err);
    }
  }

  await saveContext(domain, chatId, context, false); // no auto-sync
}
```

---

### 🔄 Usage (from `StreamingResponseCapture`)

Modify your capture like this:

```js
await saveStreamChunk(window.location.hostname, "chatgpt-chat", buffer);
```

Or better yet, dynamically parse `domain` and `chatId` via your `parseUrlForIds()` utility:

```js
import { parseUrlForIds } from "./contextStorage.js";

const { domain, chatId } = parseUrlForIds(window.location.href);
await saveStreamChunk(domain, chatId, buffer);
```

---

### 📦 Notes

- ⛓ **Encryption** only triggers every few entries to reduce network chatter.
- 📜 Appends `type: "streamed"` so your viewer can filter live captures.
- 🪵 All chunks get stored in the same `ctx_{domain}_{chatId}` entry list.
- 🧠 You can now reconstruct a chat with **timestamps** + **content flow**.
