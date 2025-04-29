Perfect. Here's a **comprehensive manual test plan** starting with **the most basic parsing features**, and scaling up **feature-by-feature** based on your build path.

This plan is designed for manual QA and sanity checks at each phase before you commit.

---

# ✅ **God Mode Extension – Manual Test Plan**

Each section includes:

| ✅  | Step | What to Do | What to Look For |
| --- | ---- | ---------- | ---------------- |

---

## 🔹 1. **Basic Input & Output Parsing (`OracleParser`)**

### **Input Parser**

| ✅  | Step | What to Do                                                        | What to Look For                                                      |
| --- | ---- | ----------------------------------------------------------------- | --------------------------------------------------------------------- |
| ⬜  | 1.1  | Open ChatGPT or Claude                                            | Ensure you have a chat open                                           |
| ⬜  | 1.2  | Type a message but **don’t hit Enter**                            | Message exists in the `<textarea>`                                    |
| ⬜  | 1.3  | Run `OracleParser.getInstance().parseInput(textarea)` in devtools | Should return a `OracleLog` with type: `input`, and correct `content` |
| ⬜  | 1.4  | Now hit Enter and re-run input parser                             | The new textarea content should reflect the updated input             |
| ⬜  | 1.5  | Check `.raw.text` and `.raw.markdown`                             | Should match `.content` and not be empty                              |

### **Output Parser**

| ✅  | Step | What to Do                                            | What to Look For                                    |
| --- | ---- | ----------------------------------------------------- | --------------------------------------------------- |
| ⬜  | 1.6  | Let the AI finish streaming a response                | Response element fully visible                      |
| ⬜  | 1.7  | Run `OracleParser.getInstance().parseOutput(element)` | Output log with full content, correct metadata      |
| ⬜  | 1.8  | Check `.raw.markdown`                                 | Code blocks and bullet lists are properly converted |
| ⬜  | 1.9  | Confirm `metadata.role` is `assistant`                | Role should auto-detect correctly                   |

---

## 🔹 2. **Log Storage (`OracleStorage`)**

| ✅  | Step | What to Do                                                        | What to Look For                                                |
| --- | ---- | ----------------------------------------------------------------- | --------------------------------------------------------------- |
| ⬜  | 2.1  | Call `OracleStorage.getInstance().saveLog(log)` with parsed input | Log should persist to `chrome.storage.local`                    |
| ⬜  | 2.2  | Reload the page                                                   | Nothing breaks, storage persists                                |
| ⬜  | 2.3  | Run `getFullContext(chatId)`                                      | Returns logs including what you saved                           |
| ⬜  | 2.4  | Add multiple logs and inspect local storage manually              | All logs stored under `oracle_logs` key, size grows as expected |

---

## 🔹 3. **Streaming Output Capture (`StreamingResponseCapture`)**

| ✅  | Step | What to Do                                       | What to Look For                           |
| --- | ---- | ------------------------------------------------ | ------------------------------------------ |
| ⬜  | 3.1  | Load a page and inject `basic-stream-watcher.js` | Console logs: “Watching stream container…” |
| ⬜  | 3.2  | Trigger an AI response                           | See logs appear as content mutates         |
| ⬜  | 3.3  | Inspect `bufferMap` (if exposed)                 | Entry should match streaming content       |
| ⬜  | 3.4  | Ensure no duplicate messageIds                   | Message IDs should be unique per stream    |

---

## 🔹 4. **Platform Adapters (`ChatGPTAdapter`, `ClaudeAdapter`)**

| ✅  | Step | What to Do                                                                 | What to Look For                                 |
| --- | ---- | -------------------------------------------------------------------------- | ------------------------------------------------ |
| ⬜  | 4.1  | Visit `chat.openai.com`                                                    | `getAdapterForPlatform()` returns ChatGPTAdapter |
| ⬜  | 4.2  | Run `adapter.identifyMessageContainers()`                                  | Returns array of visible chat bubbles            |
| ⬜  | 4.3  | Run `adapter.extractMessageContent(container)`                             | Returns string content from a bubble             |
| ⬜  | 4.4  | Visit `claude.ai` and repeat above                                         | ClaudeAdapter activates and parses correctly     |
| ⬜  | 4.5  | Confirm `detectDeletion()` returns `true` if element is blanked or deleted | Tracks deletions accurately                      |

---

## 🔹 5. ** Gist Sync**

| ✅  | Step | What to Do                                    | What to Look For                                      |
| --- | ---- | --------------------------------------------- | ----------------------------------------------------- |
| ⬜  | 5.1  | Enable encrypted Gist config in local storage | Ensure `encryptedPATOracle` and `gistURLOracle` exist |
| ⬜  | 5.2  | Call `Oracle.syncNow()` manually              | Syncs encrypted data to Gist                          |
| ⬜  | 5.3  | Check Gist file `Oracle.Context.json`         | Payload is encrypted, not raw JSON                    |
| ⬜  | 5.4  | Unplug connection (offline), trigger sync     | Graceful fail + warning in console                    |

---

## 🔹 6. **Deleted Message Tracking**

| ✅  | Step | What to Do                          | What to Look For                                      |
| --- | ---- | ----------------------------------- | ----------------------------------------------------- |
| ⬜  | 6.1  | Let chat populate                   | Log initial messages into snapshot                    |
| ⬜  | 6.2  | Delete a node from the DOM manually | Message node disappears                               |
| ⬜  | 6.3  | Run `scanAndTrackDeletions()`       | Deleted message ID appears in `deletedMessages[]`     |
| ⬜  | 6.4  | Check stored context                | Preserved `.originalContent` exists for deleted entry |

---

### Search

| ✅  | Step | What to Do                      | What to Look For         |
| --- | ---- | ------------------------------- | ------------------------ |
| ⬜  | 8.4  | Type partial word in search box | Results filter instantly |
| ⬜  | 8.5  | Delete input                    | Clears result box        |

### Export

| ✅  | Step | What to Do              | What to Look For                     |
| --- | ---- | ----------------------- | ------------------------------------ |
| ⬜  | 8.6  | Click “Export JSON”     | Download triggers with full context  |
| ⬜  | 8.7  | Click “Export Markdown” | Clean `.md` file saved with sections |

---

## 🔹 9. **Markdown Conversion (`htmlToMarkdown`)**

| ✅  | Step | What to Do                                                          | What to Look For                        |
| --- | ---- | ------------------------------------------------------------------- | --------------------------------------- |
| ⬜  | 9.1  | Feed a `<div>` with `<code>`, `<ul>`, `<a>` into `htmlToMarkdown()` | Returns properly formatted Markdown     |
| ⬜  | 9.2  | Feed malformed or empty DOM                                         | Returns empty string, no crash          |
| ⬜  | 9.3  | Pipe output into Markdown viewer                                    | Renders exactly like expected chat text |
