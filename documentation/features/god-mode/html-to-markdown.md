✅ `htmlToMarkdown` is now implemented using **Turndown.js**, tailored for your God Mode extension.

---

### 🔁 What it supports:

- ✅ Code blocks (`<pre><code>`)
- ✅ Inline code (`<code>`)
- ✅ Lists (bulleted and numbered)
- ✅ Headers (H1–H6)
- ✅ Links (`<a href="">`)

---

### ✨ Usage:

```js
import { htmlToMarkdown } from "./html-to-markdown.js";

const markdown = htmlToMarkdown(someHTMLElement);
```

---

This can now be safely wired into `OracleParser.parseInput()` and `parseOutput()`.

Let me know if you want this injected during DOM capture automatically next.

```
// src/features/god-mode/oracle-tracker/html-to-markdown.js

import TurndownService from "turndown";

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
});

turndown.addRule("inlineCodeFix", {
  filter: function (node) {
    return (
      node.nodeName === "CODE" &&
      node.parentNode?.nodeName !== "PRE"
    );
  },
  replacement: function (content) {
    return "`" + content + "`";
  },
});

/**
 * Converts an HTML element into markdown
 * @param {HTMLElement} element
 * @returns {string} markdown
 */
export function htmlToMarkdown(element) {
  if (!element || !element.outerHTML) return "";
  return turndown.turndown(element.outerHTML);
}
```
