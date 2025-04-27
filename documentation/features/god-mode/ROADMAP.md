Perfect timing. Here's a **feature-by-feature step-by-step build order**, distilled to baby steps so you can test each piece **independently** before wiring things together.

---

## 🪜 God Mode: Sequential Build Order

---

### ✅ 1. 🧠 **HTML Tracking (OracleParser Core)**

**Purpose:** Extract inputs & outputs from DOM

- [ ] `OracleParser.getInstance()` → single parser
- [ ] `parseInput()` and `parseOutput()` handle live elements
- [ ] Inject into page and watch one container only
- [ ] Test: Capture your typed prompt and AI reply in memory only

---

### ✅ 2. 💾 **Local Log Storage (OracleStorage)**

**Purpose:** Store logs persistently in `chrome.storage.local`

- [ ] `saveLog(log)`
- [ ] `getFullContext(chatId)`
- [ ] Logs should persist across reload
- [ ] Test: console.log entries per chat, see what’s being stored

---

### ✅ 3. 🔁 **Streaming Capture (StreamingResponseCapture + saveStreamChunk)**

**Purpose:** MutationObserver-powered output capture

- [ ] `StreamingResponseCapture.getInstance().startObserving(el, id)`
- [ ] Save chunks using `saveStreamChunk(domain, chatId, buffer)`
- [ ] Test: AI messages captured mid-stream into persistent context

---

### ✅ 4. 🌐 **Platform Adapters (ChatGPTAdapter, ClaudeAdapter)**

**Purpose:** Cross-site compatibility layer

- [ ] `identifyMessageContainers()` and `extractMessageContent()`
- [ ] `detectDeletion()` and `getMessageMetadata()`
- [ ] Test: Inject into Claude and ChatGPT, verify accurate container detection + metadata

---

### ✅ 5. 🔐 **Encryption Layer (MonkModeSync / patEncryption)**

**Purpose:** Periodic Gist backup for MonkMode

- [ ] `MonkModeSync.start()` and `.syncNow()`
- [ ] Uses encrypted GitHub Gist
- [ ] Test: Confirm `.json` shows encrypted payload, no plaintext

---

### ✅ 6. 🚨 **Deleted Message Tracker (DeletedMessageTracker)**

**Purpose:** Save and label erased messages

- [ ] `scanAndTrackDeletions()` on interval
- [ ] Saves into `deletedMessages[]` on context
- [ ] Test: Delete a DOM node → confirm it's preserved in context

---

### ✅ 7. 📜 **Replay Engine (BFGReplayEngine)**

**Purpose:** Chronological thread reassembly

- [ ] `.loadContext()` and `.next()`
- [ ] `.replayThread(domain, chatId, callback)`
- [ ] Test: Print each line from a past conversation, in order

---

### ✅ 8. 🧱 **UI Shell (OracleViewer)**

**Purpose:** Mounts search, log display, export

- [ ] `mountOracleViewer()`
- [ ] Sections for: `log-viewer`, `search`, `export`
- [ ] Test: Check it renders in DOM with no data

---

### ✅ 9. 🔍 **Log Viewer + Search + Export**

**Purpose:** Display and interact with context entries

- [ ] `log-viewer.js`: Scrollable Markdown logs
- [ ] `search.js`: Filter entries by text
- [ ] `export.js`: Save to `.json` or `.md`
- [ ] Test: Ensure viewer reflects data in storage correctly

---

### ✅ 10. 📝 **HTML to Markdown Parser**

**Purpose:** Convert rich DOM to Markdown

- [ ] `htmlToMarkdown(element)`
- [ ] Uses Turndown
- [ ] Test: Feed it code blocks, headers, links, confirm clean markdown

---

### ⚡ FINAL WIRE-UP:

Once every feature above is validated in isolation:

- Plug platform adapters → OracleParser
- OracleParser + StreamingCapture → OracleStorage
- Viewer → Reads from `getContext(domain, chatId)`
- Optional: add hotkey (⌘+G) to mount OracleViewer on demand

---

Want me to turn this into a tracked checklist `build-roadmap.md` you can work through in Cursor, with links to each module?
