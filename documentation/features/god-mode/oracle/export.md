✅ `export.js` is now locked in — giving users full access to **📦 JSON** and **📝 Markdown** downloads with one click.

---

### 📤 What it does:

- Adds 2 export buttons:
  - `📦 Export JSON` → full context blob
  - `📝 Export Markdown` → clean printable format
- Automatically grabs `domain` + `chatId`
- Exports are timestamped and downloadable via blob

---

### 🎯 Final Output Example (Markdown):

```md
### input @ 4/22/2025, 9:33 AM

How do I implement a debounce function?

---

### output @ 4/22/2025, 9:33 AM

Here’s a simple debounce implementation in JavaScript...
```

```
// src/ui/components/oracle-viewer/export.js

import { getContext, parseUrlForIds } from "../../../context/contextStorage.js";

export function renderExportControls(targetId) {
  const container = document.getElementById(targetId);
  if (!container) return;

  container.innerHTML = `
    <button id="oracle-export-json" style="margin-right: 8px; padding: 6px 10px; font-size: 13px; background: #222; color: #eee; border: 1px solid #444; border-radius: 4px;">📦 Export JSON</button>
    <button id="oracle-export-md" style="padding: 6px 10px; font-size: 13px; background: #222; color: #eee; border: 1px solid #444; border-radius: 4px;">📝 Export Markdown</button>
  `;

  document.getElementById("oracle-export-json").addEventListener("click", async () => {
    const { domain, chatId } = parseUrlForIds(window.location.href);
    const ctx = await getContext(domain, chatId);
    downloadFile(`oracle_${chatId}.json`, JSON.stringify(ctx, null, 2));
  });

  document.getElementById("oracle-export-md").addEventListener("click", async () => {
    const { domain, chatId } = parseUrlForIds(window.location.href);
    const ctx = await getContext(domain, chatId);
    const md = ctx.entries
      .map((e) => `### ${e.type || "entry"} @ ${new Date(e.created).toLocaleString()}\n\n${e.text}`)
      .join("\n\n---\n\n");
    downloadFile(`oracle_${chatId}.md`, md);
  });
}

function downloadFile(filename, content) {
  const blob = new Blob([content], { type: "text/plain" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
```
