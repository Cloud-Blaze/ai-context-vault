written implementation of both `StreamingResponseCapture` and `saveStreamChunk()` in **pure JS**, keeping it lean and browser-extension-ready.

---

### 🧠 `streaming-response-capture.js`

Save to:  
`src/features/god-mode/oracle-tracker/streaming-response-capture.js`

```js
import { OracleStorage } from "./storage.js";

const debounce = (fn, delay) => {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
};

export const StreamingResponseCapture = (() => {
  let instance;
  const bufferMap = new Map();

  const observer = new MutationObserver((mutations) => {
    const content = mutations
      .map((m) => (m.target.textContent || "").trim())
      .join("");

    if (!content) return;

    const messageId = getLastMessageId();
    if (!messageId || !bufferMap.has(messageId)) return;

    const buffer = bufferMap.get(messageId);
    buffer.content = content;
    buffer.timestamp = Date.now();

    debouncedSave(messageId);
  });

  const debouncedSave = debounce(async (messageId) => {
    const buffer = bufferMap.get(messageId);
    if (!buffer) return;
    await OracleStorage.getInstance().saveStreamChunk(messageId, buffer);
  }, 300);

  const getLastMessageId = () => {
    const ids = Array.from(bufferMap.keys());
    return ids.length > 0 ? ids[ids.length - 1] : null;
  };

  return {
    getInstance: () => {
      if (!instance) {
        instance = {
          startObserving(container, messageId) {
            if (!bufferMap.has(messageId)) {
              bufferMap.set(messageId, {
                messageId,
                content: "",
                timestamp: Date.now(),
                isComplete: false,
              });
            }
            observer.observe(container, {
              childList: true,
              characterData: true,
              subtree: true,
            });
          },
        };
      }
      return instance;
    },
  };
})();
```

---

### 💾 Add `saveStreamChunk()` to `oracle-storage.js`

Add this to your existing `OracleStorage` singleton:

```js
async saveStreamChunk(messageId, buffer) {
  const logs = await this.getLocalLogs();

  const existing = logs.find((log) => log.id === messageId);

  if (existing) {
    existing.content = buffer.content;
    existing.timestamp = buffer.timestamp;
  } else {
    logs.push({
      id: messageId,
      timestamp: buffer.timestamp,
      type: "output",
      content: buffer.content,
      metadata: {
        domain: window.location.hostname,
        chatId: "streaming-chat", // Replace if you can grab real chatId
        contextWindow: 2048,
        role: "assistant",
      },
      raw: {
        html: "",
        text: buffer.content,
        markdown: buffer.content,
      },
    });
  }

  const processedLogs = this.processLogs(logs);

  await chrome.storage.local.set({
    oracle_logs: processedLogs,
  });
}
```

---

If you're ready, next step is either:

- 🧩 Hooking this into your real DOM watcher via a `ChatGPTAdapter`, or
- 🧼 Building a tiny popup that shows live streaming logs

Want me to do either of those next in JS?
