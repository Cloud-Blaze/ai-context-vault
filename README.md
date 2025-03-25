# 🚀 **AI Context Vault (Chrome Extension)**

> _A browser extension to easily manage, store, and inject custom context into AI chat interfaces (ChatGPT, Claude, DeepSeek Web, etc.). Built for productivity, clarity, and never repeating yourself._

---

## 📁 **Project Folder Structure**

```
ai-context-keeper/
├── public/
│   ├── icon.png
│   └── manifest.json
├── src/
│   ├── content/
│   │   ├── inject.js
│   │   └── ui-overlay.js
│   ├── background/
│   │   └── background.js
│   ├── storage/
│   │   └── contextStorage.js
│   └── options/
│       ├── options.html
│       ├── options.js
│       └── options.css
└── README.md
```

---

## 🧱 **File Purposes and Explanations**

### 🔹 **public/**

- `manifest.json`: Declares permissions, matches AI chat URLs, defines keyboard shortcuts, and injects scripts.
- `icon.png`: Simple branded icon.

### 🔹 **src/content/**

- `inject.js`: DOM manipulation to inject the context text into AI chat boxes.
- `ui-overlay.js`: Floating UI triggered by hotkeys (`CTRL+SHIFT+I`) to manage context.

### 🔹 **src/background/**

- `background.js`: Event listeners for hotkeys and messaging between tabs, storage, and the UI.

### 🔹 **src/storage/**

- `contextStorage.js`: CRUD management of localStorage for each URL context. Easy import/export JSON format.

### 🔹 **src/options/**

- `options.html/css/js`: Dedicated full-page options/settings for advanced management of contexts.

---

## 🎛️ **Key Features & Behaviors**

### 🔸 **Context Saving (Hotkey: CTRL+I)**

- Grab selected/highlighted text on-page.
- Store in local storage tied specifically to the chat URL domain and full URL parameters.
- Duplicate entries prevented.

### 🔸 **Context Management UI (Hotkey: CTRL+SHIFT+I)**

- Floating UI to quickly:
  - View/edit/delete stored context entries.
  - Quick toggles for enabling/disabling entries.
  - Edit a top-level "initial summary" text block, prepended above all entries.

### 🔸 **Context Injection (Send Override)**

- DOM modification of ChatGPT send button (`button[aria-label="Send message"]`)—no new hotkeys needed.
- Clicking Send auto-prepends:
  - Initial summary (if exists) followed by a newline
  - All active memory entries as bulleted lists, then two newlines.
  - Finally, user's actual typed prompt.

### 🔸 **Context Transfer**

- Export/import JSON of context entries (for migration or sharing).

---

## 🛠️ **UI Mockup / Wireframe**

```
┌───────────────────────────────────────────────────┐
│ ✨ AI Context Keeper (CTRL+SHIFT+I)                │
├───────────────────────────────────────────────────┤
│ [🖊️ Initial Summary (optional)]                    │
│ A short description of your overarching goal.     │
│                                                  │
│ ┌───────────────────────────────────────────────┐ │
│ │ 📌 Saved Context Items                        │ │
│ ├───────────────────────────────────────────────┤ │
│ │ ☑️ This is a slideshow project                │ │
│ │ ☑️ Videos organized in static event folders   │ │
│ │ ☐ Using Whisper and DeepSeek integration      │ │
│ │ ☑️ Nvidia RTX 4070 GPU setup                  │ │
│ └───────────────────────────────────────────────┘ │
│ ┌──────────────────────┐ ┌──────────────────────┐ │
│ │➕ New Context Item    │ │🔁 Import/Export JSON │ │
│ └──────────────────────┘ └──────────────────────┘ │
└───────────────────────────────────────────────────┘
```

---

## 🚩 **Prompt Engineering (For Cursor, Cline, or Copilot)**

**Example Prompts**:

### ✅ **Generate `manifest.json`**

```
Generate a Chrome manifest v3 file named "manifest.json" that requests:
- "storage", "activeTab", and "scripting" permissions.
- Matches AI chat URLs: ["https://chat.openai.com/*", "https://claude.ai/*", "https://deepseek.com/*"]
- Injects "src/content/inject.js" and "src/content/ui-overlay.js".
- Hotkey commands CTRL+I ("save-selected-context") and CTRL+J ("show-context-manager").
```

### ✅ **DOM Injection JS (`inject.js`)**

```
Write a JavaScript content script ("inject.js") to override the send button of ChatGPT, Claude, and DeepSeek chat interfaces, prepending stored context entries from localStorage (keyed by the URL) into the textbox before submission.
```

### ✅ **Context Storage API**

```
Write a JavaScript module ("contextStorage.js") providing:
- addContext(url, text), deleteContext(url, text), getContext(url), updateInitialSummary(url, summary).
- Stores data cleanly in localStorage, JSON format.
- Can export/import JSON easily.
```

### ✅ **UI Overlay (React)** _(optional)_

```
Generate a minimal React overlay component triggered by CTRL+SHIFT+I for managing context items, toggling active state, and editing/deleting text entries directly from a floating panel.
```
