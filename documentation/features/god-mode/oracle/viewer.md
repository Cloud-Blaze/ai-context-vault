✅ OracleViewer is scaffolded in plain JavaScript with zero frameworks — ready for Cursor or vanilla injection.

---

### 🧱 `index.js` Summary:

- Mounts a viewer UI into the page (`#oracle-viewer`)
- Includes slots for:
  - 🔍 `#oracle-search`
  - 💾 `#oracle-export`
  - 📜 `#oracle-log-viewer`
- Uses basic styles for dark overlay

---

### 🧠 Next up:

Do you want me to dump:

- `log-viewer.js` for scrollable Markdown-ified logs?
- `search.js` for fuzzy keyword live filtering?
- `export.js` to save chat history as `.md` or `.json`?

```
// src/ui/components/oracle-viewer/index.js

import { renderLogViewer } from "./log-viewer.js";
import { renderSearch } from "./search.js";
import { renderExportControls } from "./export.js";

export function mountOracleViewer(rootId = "oracle-viewer") {
  let root = document.getElementById(rootId);

  if (!root) {
    root = document.createElement("div");
    root.id = rootId;
    document.body.appendChild(root);
  }

  root.innerHTML = `
    <div style="font-family: sans-serif; background: #111; color: #eee; padding: 12px; max-height: 90vh; overflow-y: auto; border: 1px solid #444">
      <h2 style="margin-top: 0;">🧠 Oracle Viewer</h2>
      <div id="oracle-search"></div>
      <div id="oracle-export"></div>
      <div id="oracle-log-viewer"></div>
    </div>
  `;

  renderSearch("oracle-search");
  renderExportControls("oracle-export");
  renderLogViewer("oracle-log-viewer");
}

```
