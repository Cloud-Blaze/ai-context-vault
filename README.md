# 🚀 **AI Context Vault (Chrome Extension)**

> _A browser extension to easily manage, store, and inject custom context into AI chat interfaces (ChatGPT, Claude, DeepSeek Web, etc.). Built for productivity, clarity, and never repeating yourself._

---

## 🎛️ **Key Features & Behaviors**

### 🔸 **Context Saving (Hotkey: ALT+I)**

- Grab selected/highlighted text on-page.
- Store in local storage tied specifically to the chat URL domain and full URL parameters.
- Duplicate entries prevented.

### 🔸 **Context Management UI (Hotkey: ALT+SHIFT+I)**

- Floating UI to quickly:
  - View/edit/delete stored context entries.
  - Quick toggles for enabling/disabling entries.
  - Edit a top-level "initial summary" text block, prepended above all entries.

### 🔸 **Context Injection (Send Override)**

- Use `ALT+ENTER` to prepend context to your message without sending
- Use `ALT+SHIFT+ENTER` to inject context and send immediately
- Use `ALT+I` Add any message in existing prompts to your chat database (synced across github gists for multiple chrome browser/computer support)
- Use `ALT+SHIFT+I` Toggle the CRUD management tool for the chat you are on.
- Context is automatically formatted with:
  - Initial summary (if exists) followed by a newline
  - All active memory entries as bulleted lists, then two newlines
  - Finally, user's actual typed prompt

### 🔸 **Context Transfer**

- Export/import JSON of context entries (for migration or sharing).
