# 🚀 **AI Context Vault (Chrome Extension)**

> _A browser extension to easily manage, store, and inject custom context into AI chat interfaces (ChatGPT, Claude, DeepSeek Web, etc.). Built for productivity, clarity, and never repeating yourself._

---

## 🎛️ **Key Features & Behaviors**

## ✨ Features

- 🧠 Save context snippets from any AI chat with `CMD+I` (`CTRL+I` on Windows)
- 📝 Edit and manage context per chat
- 🔁 **GitHub Gist Sync** for persistent cloud storage across devices and browsers
  - Automatically syncs all saved context and bookmarks to your GitHub Gist
  - Uses a personal access token (PAT) with `gist` scope
  - Keeps everything backed up and portable
- 🔖 **Bookmarks**: Highlight key parts of chats and jump to them later
  - Press `CMD+B` (`CTRL+B`) to add a bookmark
  - Bookmarks show up in the overlay alongside context
  - Click bookmarks to scroll to their matching text in the chat
  - Rename bookmarks inline for clarity
  - Easily delete or manage them like context

### 🔸 **Context Saving (Hotkey: CTRL or CMD+I)**

- Grab selected/highlighted text on-page.
- Store in local storage tied specifically to the chat URL domain and full URL parameters.
- Duplicate entries prevented.

### 🔸 **Context Management UI (Hotkey: CTRL or CMD+J)**

- Floating overlay UI to quickly:
  - View/edit/delete context entries
  - Edit summary for the current chat
  - Manage bookmarks visually
  - Switch between context and bookmark tabs
  - Sort entries by most recently updated

### 🔸 **📌 Bookmarks (Hotkey: CTRL or CMD+B)**

- Select key parts of a conversation, hit the hotkey, and save that line as a bookmark.
- Each bookmark includes:
  - A fallback text anchor (for accurate scroll matching)
  - A human-readable label (editable inline)
  - Timestamp and metadata
- In the overlay:
  - View all bookmarks for the current chat
  - Click to auto-scroll and highlight the original chat message
  - Edit label by clicking the ✎ icon (and save with ✓)
  - Delete instantly with ×
- Bookmarks persist across sessions and sync with GitHub Gist.

## 🔧 GitHub Sync Setup

> GitHub Gist sync allows you to back up and restore your data across Chrome profiles, browsers, or machines.

1. **Create a GitHub Gist**

   - Go to [https://gist.github.com](https://gist.github.com)
   - Create a new _secret_ gist (it can be empty)
   - Copy the Gist URL

2. **Generate a Personal Access Token (PAT)**

   - Visit [GitHub Personal Access Tokens](https://github.com/settings/tokens)
   - Create a Fine-grained token with `gist` permissions
   - Copy the token (you won't see it again)

3. **Paste into Extension Settings**
   - Open the extension's Options page
   - Paste your Gist URL and PAT
   - Data will auto-sync from now on every time context or bookmarks change

### 🔸 **Context Injection (Send Override)**

- Use `ALT+ENTER` to prepend context to your message without sending
- Use `ALT+SHIFT+ENTER` to inject context and send immediately
- Use `CTRL or CMD +I` Add any message in existing prompts to your chat database (synced across github gists for multiple chrome browser/computer support)
- Use `CTRL or CMD +J` Toggle the CRUD management tool for the chat you are on.
- Context is automatically formatted with:
  - Initial summary (if exists) followed by a newline
  - All active memory entries as bulleted lists, then two newlines
  - Finally, user's actual typed prompt

### 🔸 **Context Transfer**

- Export/import JSON of context entries (for migration or sharing).

### 🧑🏽‍💻 Todos

- [ ] Add ability to copy all context/bookmarks as JSON
- [ ] Add a polished icon for the extension
- [ ] Publish on the Chrome Web Store
- [ ] Create a $7.99 licensed version with a GitHub Sync nag screen every 10 context adds
- [ ] Simple cloudless auth check for donors (serverless endpoint w/ hardcoded list)
- [ ] Firefox and Safari versions
- [ ] Auto-bookmark mode (optional)
- [ ] Publish website under github and chrome store

## ❤️ Built for tinkerers, memory-lovers, and productivity nerds.
