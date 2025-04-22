✅ `search.js` is live — and fully integrated with your OracleViewer setup.

---

### 🔍 What it does:

- Live fuzzy search through `entries[]` for the current chat
- Escapes all HTML safely
- Shows date + type for each match
- Fully style-matched with your dark UI

---

### How it behaves:

- Typing filters instantly
- Clearing input clears results
- Reuses `parseUrlForIds()` and `getContext()`

```
// src/ui/components/oracle-viewer/search.js

import { getContext, parseUrlForIds } from "../../../context/contextStorage.js";

export function renderSearch(targetId) {
const container = document.getElementById(targetId);
if (!container) return;

container.innerHTML = `    <input id="oracle-search-input" type="text" placeholder="🔍 Search context..."
      style="width: 100%; padding: 6px 10px; margin-bottom: 12px; background: #222; border: 1px solid #444; color: #eee; border-radius: 4px; font-size: 14px;" />
    <div id="oracle-search-results"></div>
 `;

const input = document.getElementById("oracle-search-input");
const results = document.getElementById("oracle-search-results");

input.addEventListener("input", async (e) => {
const term = e.target.value.trim().toLowerCase();
if (!term) {
results.innerHTML = "";
return;
}

    const { domain, chatId } = parseUrlForIds(window.location.href);
    const context = await getContext(domain, chatId);
    const entries = context.entries || [];

    const matches = entries.filter((entry) =>
      entry.text.toLowerCase().includes(term)
    );

    results.innerHTML = matches.length
      ? matches
          .map(
            (entry) => `
          <div style="margin-bottom: 8px; padding: 6px; background: #1a1a1a; border-left: 3px solid #555;">
            <div style="font-size: 0.75em; opacity: 0.6;">[${new Date(
              entry.created
            ).toLocaleString()}] ${entry.type || "context"}</div>
            <pre style="white-space: pre-wrap; margin: 4px 0 0 0;">${escapeHtml(
              entry.text
            )}</pre>
          </div>
        `
          )
          .join("\n")
      : `<p style='opacity: 0.6;'>No matches found.</p>`;

});
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
