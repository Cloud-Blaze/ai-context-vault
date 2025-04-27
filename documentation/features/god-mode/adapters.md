- `identifyMessageContainers()` – selects all message blocks
- `extractMessageContent()` – pulls out clean, readable text
- `detectDeletion()` – platform-specific logic to track DOM purges
- `getMessageMetadata()` – adds role, domain, chatId context for storage

### 🧠 Usage Flow (for Cursor AI to pick up)

```js
import { getAdapterForPlatform } from "./adapters.js";
const adapter = getAdapterForPlatform();

const containers = adapter.identifyMessageContainers();
containers.forEach((c) => {
  const content = adapter.extractMessageContent(c);
  const deleted = adapter.detectDeletion(c);
  const meta = adapter.getMessageMetadata(c);
});
```

This is now the glue between your `StreamingResponseCapture`, `OracleStorage`, and viewer system.

Ready for the next piece? I can wire up the replay engine or pipe this straight into the parser logic.

```

// src/platforms/adapters.js

import { parseUrlForIds } from "../context/contextStorage.js";

export class ChatGPTAdapter {
  identifyMessageContainers() {
    return Array.from(document.querySelectorAll(".group.w-full.text-token-text-primary"));
  }

  extractMessageContent(container) {
    const markdownBlocks = container.querySelectorAll(".markdown.prose > *");
    return Array.from(markdownBlocks)
      .map((el) => el.innerText || el.textContent || "")
      .join("\n\n");
  }

  detectDeletion(container) {
    return container?.innerText?.trim() === "[Deleted]"; // adjust if platform adds deletion markers
  }

  getMessageMetadata(container) {
    const role = container.querySelector("svg")?.classList.contains("text-green-500") ? "assistant" : "user";
    const { domain, chatId } = parseUrlForIds(window.location.href);
    return {
      domain,
      chatId,
      contextWindow: 2048,
      role,
    };
  }
}

export class ClaudeAdapter {
  identifyMessageContainers() {
    return Array.from(document.querySelectorAll(".message-bubble"));
  }

  extractMessageContent(container) {
    const parts = container.querySelectorAll(".message-text p, .message-text span");
    return Array.from(parts)
      .map((el) => el.innerText || el.textContent || "")
      .join(" ").trim();
  }

  detectDeletion(container) {
    return container?.querySelector(".deleted-indicator") !== null;
  }

  getMessageMetadata(container) {
    const isUser = container?.classList.contains("from-user");
    const { domain, chatId } = parseUrlForIds(window.location.href);
    return {
      domain,
      chatId,
      contextWindow: 2048,
      role: isUser ? "user" : "assistant",
    };
  }
}

// Factory
export function getAdapterForPlatform() {
  const host = window.location.hostname;

  if (host.includes("chat.openai.com")) return new ChatGPTAdapter();
  if (host.includes("claude.ai")) return new ClaudeAdapter();

  throw new Error("Unsupported platform");
}
```
