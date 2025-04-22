✅ `log-viewer.js` is now implemented — totally plain JS and stylized for Markdown-style log display.

---

### 🧾 What it does:

- Loads logs from `chrome.storage.local` using the current URL context
- Renders each as a formatted `<pre>` block
- Shows:
  - 📅 timestamp
  - 📛 type (`input`, `output`, `streamed`, `context`)
  - 📜 escaped text

---

### ✅ Output Example:

```
[4/22/2025, 9:21:00 AM] input
Hello, world.

[4/22/2025, 9:21:10 AM] output
Sure! Here's an example in JavaScript...
```

---

```
// src/ui/components/oracle-viewer/log-viewer.js

import { getContext, parseUrlForIds } from "../../../context/contextStorage.js";

export async function renderLogViewer(targetId) {
  const container = document.getElementById(targetId);
  if (!container) return;

  const { domain, chatId } = parseUrlForIds(window.location.href);
  const context = await getContext(domain, chatId);
  const entries = context.entries || [];

  if (entries.length === 0) {
    container.innerHTML = "<p style='opacity: 0.6'>No logs available for this chat.</p>";
    return;
  }

  const html = entries
    .map((entry) => {
      const created = new Date(entry.created || Date.now()).toLocaleString();
      const type = entry.type || "context";
      const text = escapeHtml(entry.text || "");

      return `
        <div style="margin-bottom: 1em; padding: 0.5em; border-left: 4px solid #666; background: #1a1a1a;">
          <div style="font-size: 0.8em; opacity: 0.7;">[${created}] <strong>${type}</strong></div>
          <pre style="white-space: pre-wrap; margin: 0.25em 0 0 0;">${text}</pre>
        </div>
      `;
    })
    .join("\n");

  container.innerHTML = html;
}

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

```
