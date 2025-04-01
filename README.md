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

## 🔧 Profile Manager (New)

AI Context Vault now supports persistent identity profiles that define how the AI should behave during your chats — across any LLM interface.

### 🧠 What It Does

- Create role-based profiles (e.g. Developer, Business, or Custom)
- Each profile includes:
  - Alias name
  - Summary (overview of your goals)
  - CSV of selected technologies or business rules
- Only one profile can be active at a time
- Active profile auto-injects at the top of every prompt for consistent results

### 🛠 Example Use Cases

- **Developer Mode**: Use a profile that says you're working in React and TypeScript with strict standards.
- **Business Mode**: Define your tone (e.g. "Formal"), SEO goals, or sales targets.
- **Custom Modes**: Invent your own — from roleplay to project personas.

### 📁 Stored Locally, Synced Securely

- Profiles are saved locally in `chrome.storage.local`
- Automatically synced to GitHub Gist if you’ve connected a Personal Access Token (PAT)
- Encryption handled using Cloudflare’s WebCrypto API (see “Security” section)

### ✨ Access and Edit Anytime

- From the floating overlay (CMD+J / CTRL+J), go to the new **Profiles** tab
- Or from the **Options Page**, edit aliases, summaries, and attributes visually
- Profiles use the same UI style and edit patterns as bookmarks/context

---

> AI Context Vault gives your chats a persistent identity layer — across models and sessions. Use it to make every prompt smarter, faster, and more “you.”

1. **Create a GitHub Gist**

   - Go to [https://gist.github.com](https://gist.github.com)
   - Create a new _secret_ gist (it can be empty)
   - Copy the Gist URL

2. **Generate a Personal Access Token (PAT)**

   - Visit [GitHub Personal Access Tokens](https://github.com/settings/tokens)
   - Create a Fine-grained token with `gist` permissions
   - Copy the token (you won't see it again)
   - Your PAT is automatically encrypted using Cloudflare's WebCrypto API before being stored
   - The encryption key is securely stored in Cloudflare Workers and never leaves their infrastructure
   - Your PAT is only decrypted when needed for GitHub Gist operations

3. **Paste into Extension Settings**
   - Open the extension's Options page
   - Paste your Gist URL and PAT
   - Data will auto-sync from now on every time context or bookmarks change
   - Your PAT remains encrypted at rest and is only decrypted when needed for GitHub operations

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

---

## 👤 Profile Manager (New)

The Profile Manager allows you to define persistent roles (Developer, Business, Custom) and inject relevant AI context dynamically into any chat interface.

### Features:

- Role-based profiles: Developer, Business, or Custom
- CSV-generated context from checkbox selections
- Profiles auto-inject on every prompt when active
- GitHub Gist Sync alongside bookmarks/context
- Inline editing, deletion, and activation toggle

### Implementation Tasks:

#### Inject.js

- [ ] Create **Profiles** tab in overlay
- [ ] List aliases with inline editing
- [ ] Star toggle for active profile
- [ ] [+ New Profile] redirects to options.html

#### Options.js

- [ ] Build form UI with dropdowns and checkboxes
- [ ] Handle profile alias validation
- [ ] Generate CSV from selections
- [ ] Persist and update profile data

#### ContextStorage.js

- [ ] Implement `saveProfile()`, `getProfiles()`, `updateProfile()`, `deleteProfile()`
- [ ] Sync profiles using `ctx_profiles_` key prefix

---

## 🧠 Context Questions Feature (Planned)

Pulls structured prompt/question data dynamically from GitHub-hosted JSON categorized by AI topics (SEO, Ads, Business, etc).

### Cloud Data Structure

- Each JSON file contains:

```json
[
  { "Q": "How can I optimize my SEO title tags?" },
  { "Q": "What is the role of content marketing in ranking?" }
]
```

- Files organized by category and tab (e.g., `/cloud/Marketing_Sales/Google_SEO.json`)
- Top-level index JSON references all available categories and tabs

### UI/UX Design Plan:

- Sidebar or hover button near chat input
- Picker UI:
  - Step 1: Select Category
  - Step 2: Select Subtopic
  - Step 3: Load and insert questions
- Optional: “Insert Random Question” or “Smart Suggest” based on conversation history

### Implementation Tasks:

#### Cloud Integration

- [ ] Create category index JSON (e.g. categories.json)
- [ ] Auto-fetch category files on demand
- [ ] Cache responses in localStorage

#### inject.js UI

- [ ] Build dropdown or floating panel next to chat
- [ ] Populate dynamically from GitHub
- [ ] Support click-to-insert for each question
- [ ] Smart scroll-to and highlight

#### GitHub Storage

- [ ] Upload structured files per tab
- [ ] Update top-level manifest on sync
- [ ] Maintain versioning of questions

#### Long-Term Ideas

- [ ] AI-assisted clustering of related questions
- [ ] Allow users to save "favorites" or personal bundles

- [ ] Add ability to copy all context/bookmarks as JSON
- [ ] Add a polished icon for the extension
- [ ] Publish on the Chrome Web Store
- [ ] Create a $7.99 licensed version with a GitHub Sync nag screen every 10 context adds
- [ ] Simple cloudless auth check for donors (serverless endpoint w/ hardcoded list)
- [ ] Firefox and Safari versions
- [ ] Auto-bookmark mode (optional)
- [ ] Publish website under github and chrome store

## ❤️ Built for tinkerers, memory-lovers, and productivity nerds.
