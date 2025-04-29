// Provider configurations for different AI chat interfaces

export const chatgptConfig = {
  name: "chatgpt",
  selectors: {
    userMessage: 'div[data-message-author-role="user"] .whitespace-pre-wrap',
    aiMessage: "article",
    aiText: ".markdown.prose p",
    codeBlock: "pre",
    codeContent: "code",
    codeLanguage: "div.flex.items-center",
    imageUrl: 'img[alt="Generated image"]',
    messageId: "[data-message-id]",
    modelSlug: "[data-message-model-slug]",
  },
  extractors: {
    userText: (element) => element.textContent.trim(),
    aiText: (element) => {
      const text = element
        .querySelector(chatgptConfig.selectors.aiText)
        ?.textContent.trim();
      return text;
    },
    codeBlock: (element) => {
      const preElement = element.querySelector(
        chatgptConfig.selectors.codeBlock
      );
      if (!preElement) return null;

      const codeElement = preElement.querySelector(
        chatgptConfig.selectors.codeContent
      );
      const languageElement = preElement.querySelector(
        chatgptConfig.selectors.codeLanguage
      );

      if (!codeElement) return null;

      return {
        language: languageElement?.textContent.trim() || "text",
        content: codeElement.textContent.trim(),
        html: codeElement.innerHTML,
      };
    },
    imageUrl: async (element) => {
      const imgElements = document.querySelectorAll(
        'img[alt="Generated image"]'
      );

      if (!imgElements.length) {
        console.error("[AI Context Vault] No images found");
        return null;
      }

      const visibleImg = Array.from(imgElements).find((img) => {
        const style = window.getComputedStyle(img);
        return parseFloat(style.opacity) > 0;
      });

      if (!visibleImg?.src) {
        console.error("[AI Context Vault] No visible image found");
        return null;
      }

      try {
        const response = await fetch(visibleImg.src);
        const blob = await response.blob();
        return {
          url: visibleImg.src,
          blob: blob,
          type: blob.type,
          size: blob.size,
        };
      } catch (error) {
        console.error("[AI Context Vault] Error fetching image:", error);
        return null;
      }
    },
    messageId: (element) => element.getAttribute("data-message-id"),
    modelSlug: (element) => element.getAttribute("data-message-model-slug"),
  },
};

export const claudeConfig = {
  name: "claude",
  selectors: {
    userMessage: ".group.w-full.border-b.border-black\\/10.bg-gray-50",
    aiMessage:
      ".group.w-full.border-b.border-black\\/10.bg-gray-50.dark\\:bg-gray-900",
    aiText: ".markdown.prose.w-full.break-words.dark\\:prose-invert.light",
    codeBlock: "pre",
    codeContent: "code",
    codeLanguage: "div.flex.items-center",
    messageId: "[data-message-id]",
    modelSlug: "[data-message-model-slug]",
  },
  extractors: {
    userText: (element) => {
      const text = element
        .querySelector(
          ".markdown.prose.w-full.break-words.dark\\:prose-invert.light"
        )
        ?.textContent.trim();
      return text;
    },
    aiText: (element) => {
      const text = element
        .querySelector(claudeConfig.selectors.aiText)
        ?.textContent.trim();
      return text;
    },
    codeBlock: (element) => {
      const preElement = element.querySelector(
        claudeConfig.selectors.codeBlock
      );
      if (!preElement) return null;

      const codeElement = preElement.querySelector(
        claudeConfig.selectors.codeContent
      );
      const languageElement = preElement.querySelector(
        claudeConfig.selectors.codeLanguage
      );

      if (!codeElement) return null;

      return {
        language: languageElement?.textContent.trim() || "text",
        content: codeElement.textContent.trim(),
        html: codeElement.innerHTML,
      };
    },
    messageId: (element) => element.getAttribute("data-message-id"),
    modelSlug: (element) => element.getAttribute("data-message-model-slug"),
  },
};

export const providers = {
  "chat.openai.com": chatgptConfig,
  "chatgpt.com": chatgptConfig,
  "claude.ai": claudeConfig,
  "claude.ai/*": claudeConfig,
};
