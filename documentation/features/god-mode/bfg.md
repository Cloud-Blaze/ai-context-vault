### 🎬 What `BFGReplayEngine` Does:

- Loads a full context thread from `ctx_{domain}_{chatId}`
- Sorts it chronologically by `created`
- Streams each message entry with controlled replay flow
- Includes helpers for:
  - `reset()`
  - `getProgress()`
  - `getRemaining()`
  - `getAll()`

---

### 🔁 Sample Replay Usage:

```js
import { replayThread } from "./bfg/replay.js";

replayThread("chat.openai.com", "abc123", (msg) => {
  console.log(`[REPLAY ${msg.index}] ${msg.text}`);
});
```

---

### 🧠 Ideal for:

- Reconstructing full sessions in-memory
- Diff+restore workflows
- Export logs
- Building a literal UI “timeline scrubber”

```
// src/features/god-mode/bfg/replay.js

import { getContext } from "../../context/contextStorage.js";

export class BFGReplayEngine {
  constructor(domain, chatId) {
    this.domain = domain;
    this.chatId = chatId;
    this.replayIndex = 0;
    this.replayEntries = [];
  }

  async loadContext() {
    const ctx = await getContext(this.domain, this.chatId);
    this.replayEntries = [...(ctx.entries || [])]
      .filter((e) => e.text && e.created)
      .sort((a, b) => a.created - b.created);
  }

  hasNext() {
    return this.replayIndex < this.replayEntries.length;
  }

  next() {
    if (!this.hasNext()) return null;
    const entry = this.replayEntries[this.replayIndex++];
    return {
      text: entry.text,
      created: entry.created,
      type: entry.type || "context",
      index: this.replayIndex - 1,
    };
  }

  reset() {
    this.replayIndex = 0;
  }

  getProgress() {
    return `${this.replayIndex}/${this.replayEntries.length}`;
  }

  getRemaining() {
    return this.replayEntries.slice(this.replayIndex);
  }

  getAll() {
    return this.replayEntries;
  }
}

// Example helper to stream back full replay
export async function replayThread(domain, chatId, callback) {
  const engine = new BFGReplayEngine(domain, chatId);
  await engine.loadContext();

  while (engine.hasNext()) {
    const message = engine.next();
    await callback(message);
    await new Promise((res) => setTimeout(res, 250)); // delay between lines
  }
}

```
