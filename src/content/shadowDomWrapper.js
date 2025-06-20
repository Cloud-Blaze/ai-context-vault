// Shadow DOM wrapper utility for React components
export class ShadowDomWrapper {
  constructor() {
    this.shadowRoot = null;
    this.cssLoaded = false;
  }

  async createShadowContainer(containerId) {
    // Remove existing container if it exists
    let existingContainer = document.getElementById(containerId);
    if (existingContainer) {
      existingContainer.remove();
    }

    // Create the host element
    const hostElement = document.createElement("div");
    hostElement.id = containerId;
    document.body.appendChild(hostElement);

    // Create shadow root
    this.shadowRoot = hostElement.attachShadow({ mode: "open" });

    // Load CSS from extension
    await this.loadCSS();

    return this.shadowRoot;
  }

  async loadCSS() {
    if (this.cssLoaded) return;

    try {
      const extensionId = chrome.runtime.id;
      const response = await fetch(
        `chrome-extension://${extensionId}/inject.css`
      );

      if (!response.ok) {
        throw new Error(`Failed to load CSS: ${response.status}`);
      }

      const cssText = await response.text();

      // Create style element and inject CSS
      const style = document.createElement("style");
      style.textContent = cssText;
      this.shadowRoot.appendChild(style);

      this.cssLoaded = true;
      console.log("[AI Context Vault] CSS loaded into shadow DOM");
    } catch (error) {
      console.error(
        "[AI Context Vault] Failed to load CSS into shadow DOM:",
        error
      );
      // Fallback: create a basic style element
      const style = document.createElement("style");
      style.textContent = `
        /* Fallback styles */
        * {
          box-sizing: border-box;
        }
        body {
          margin: 0;
          padding: 0;
          font-family: system-ui, -apple-system, sans-serif;
        }
        .fixed {
          position: fixed;
        }
        .inset-0 {
          top: 0;
          right: 0;
          bottom: 0;
          left: 0;
        }
        .flex {
          display: flex;
        }
        .items-start {
          align-items: flex-start;
        }
        .justify-center {
          justify-content: center;
        }
        .z-50 {
          z-index: 50;
        }
        .relative {
          position: relative;
        }
        .w-full {
          width: 100%;
        }
        .max-w-4xl {
          max-width: 56rem;
        }
        .rounded-lg {
          border-radius: 0.5rem;
        }
        .shadow-xl {
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }
        .border {
          border-width: 1px;
        }
        .border-\\[\\#23272f\\] {
          border-color: #23272f;
        }
        .bg-\\[\\#23272f\\] {
          background-color: #23272f;
        }
      `;
      this.shadowRoot.appendChild(style);
    }
  }

  createReactRoot(container) {
    // Import React and createRoot dynamically
    return import("react").then((React) => {
      return import("react-dom/client").then(({ createRoot }) => {
        return createRoot(container);
      });
    });
  }

  cleanup() {
    if (this.shadowRoot && this.shadowRoot.host) {
      this.shadowRoot.host.remove();
      this.shadowRoot = null;
      this.cssLoaded = false;
    }
  }
}
