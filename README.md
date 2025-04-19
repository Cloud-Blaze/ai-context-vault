# 🚀 AI Context Vault (Chrome Extension)

> _A browser extension to manage, store, and inject custom context into AI chat interfaces (ChatGPT, Claude, DeepSeek Web, etc.). Built for productivity, clarity, and protecting your mental well-being._

---

## Mission & Vision: Empower Your Mind, Safeguard Your Narrative

**Our Vision:**  
To reclaim and protect your narrative in a world where AI has limited memory. AI Context Vault is designed not only to preserve your critical ideas but also to act as a digital safety net—prompting supportive intervention when emotional challenges arise.

---

## 📹 Learn More By Watching a walk through

[![Watch the Demo](https://img.youtube.com/vi/ZIPAgmuEVTU/0.jpg)](https://www.youtube.com/watch?v=ZIPAgmuEVTU)


**Our Mission:**

- **Real-Time Support & Safety:**  
  When heightened emotional states or triggers are detected, our tool will gently pause posting on AI interfaces until you have time to regain balance.
- **Supportive Connections:**  
  In moments of overwhelming stress, the extension can automatically alert a pre-designated support contact—be it a friend, family member, or mental health professional.
- **Preserve and Empower Your Memory:**  
  Every thought, insight, or idea is safely saved. This isn’t just about data—it’s about safeguarding your most precious narratives.
- **Own Your Digital Experience:**  
  With integrated human support and secure storage, your digital interactions become a part of your growth and healing, ensuring that every contribution to your work is intentional and considered.

> This isn’t merely a tool—it’s a commitment to protect your mind and help you rebuild your digital footprint with clarity, integrity, and care.

---

## 🤯 Why AI Always Forgets (and Why Context Vault Had to Exist)

Every time you start a new message with ChatGPT or any LLM, you’re facing **digital amnesia.**

Even if the interface displays a long history of chats, the model only sees a **partial window of memory**—the context window measured in tokens.  
Once that window of memory fills up, the oldest messages disappear—not by your choice, but by **necessity.**  Go ahead and test it.  On a long thread there are deleted messages in chatgpt and more.

### 🔬 Token Windows & The Illusion of Memory

- **Token Windows:**  
  Every interaction is tokenized. Your current message, recent responses, and system prompts all take up tokens. Even models with vast capacities (like GPT-4-turbo’s 128,000 tokens) fill up quickly.
- **Memory’s Limits:**  
  When that token window is full, older messages are automatically dropped, regardless of their importance to your narrative.

---

## 🧠 The Myth of Memory

Chat UIs may display your entire history, but LLMs don’t “remember” them unless you re-inject the context manually. Services like Claude or DeepSeek remain **stateless by default**—the only true memory is the one you maintain.

---

## 🛡️ Introducing AI Context Vault

AI Context Vault was created to help you:

> **Reclaim Your Timeline. Preserve Your Insights.**  
> Save what the machine was never designed to hold.

Every highlight, bookmark, or annotation restores your narrative power and ensures that even in moments of vulnerability, your insights remain yours alone.

---

## 🎛️ Key Features & Behaviors

### ✨ Core Features

- **Context Saving (Hotkey: CTRL/CMD+I):**  
  Capture selected text from any AI chat and securely store it, tied to the chat’s unique URL.

- **Context Management UI (Hotkey: CTRL/CMD+J):**  
  A floating overlay enables you to view, edit, and delete context entries, along with managing bookmarks in one place.

- **Bookmarks (Hotkey: CTRL/CMD+B):**  
  Save key parts of your conversation with detailed anchors, editable labels, and timestamps. Your bookmarks sync seamlessly via GitHub Gist.

- **GitHub Gist Sync:**  
  Automatically back up and sync your saved context and bookmarks across all devices using a personal access token (PAT) with gist scope.

---

### 🔧 Profile Manager (New)

Now supporting persistent identity profiles that define how AI interacts with you:

- **What It Does:**  
  Create role-based profiles (e.g., Developer, Business, or Custom) with an alias, goal summary, and specific directives. Only one profile is active at a time, auto-injecting into every prompt for consistent results.

- **Usage Examples:**

  - **Developer Mode:** For working in strict coding environments like React/TypeScript.
  - **Business Mode:** To set a formal tone with specific SEO and sales targets.
  - **Custom Modes:** Tailor profiles for unique projects or personal branding.

- **Storage & Security:**  
  Profiles are stored locally and securely synced via GitHub Gist with encryption provided by Cloudflare’s WebCrypto API.

---

### 🚨 Emotional Safety Mode (Under Development)

Designed for moments when emotional stress threatens your digital interactions:

- **Automatic Trigger Pausing:**  
  When high stress or emotional triggers are detected, AI Context Vault gently pauses postings on AI interfaces to prevent impulsive actions.
- **Immediate Support Alert:**  
  The system automatically notifies your pre-configured trusted support—ensuring help is within reach when you need it most.
- **Calming Protocols:**  
  On detection of a challenging moment, the extension displays supportive messages and reminders to help you regain balance before proceeding.

---

## 🔧 GitHub Sync Setup

1. **Create a GitHub Gist:**

   - Visit [https://gist.github.com](https://gist.github.com) and create a new _secret_ gist (it can be empty).
   - Copy the Gist URL.

2. **Generate a Personal Access Token (PAT):**

   - Go to [GitHub Personal Access Tokens](https://github.com/settings/tokens) and create a fine-grained token with `gist` permissions.
   - Copy and securely store the token—it will be encrypted using Cloudflare’s WebCrypto API.

3. **Configure in Extension Settings:**
   - Open the Options page and paste your Gist URL and PAT.
   - Your data will automatically sync and remain secure.

---

## 🔸 Context Injection & Transfer

- **Context Injection (Send Override):**  
  Use `ALT+ENTER` to add context without sending, or `ALT+SHIFT+ENTER` to inject context and send immediately.  
  The system formats the context with an initial summary, bulleted memory entries, then your prompt.

- **Context Transfer:**  
  Easily export or import your context entries as JSON for backup or migration.

---

## ✊ For Builders, Thinkers, Writers, & Entrepreneurs

You should never lose your prompts or trust your thoughts to fleeting servers.  
It’s time to **own your memory** and build a digital narrative that empowers and protects you.

---

### 🧑🏽‍💻 Todos & Future Roadmap

- **God Mode Expansion:**  
  Improve long-form logging, add Markdown/JSON hybrid export, and enable offline history replay with filtering.

- **Monk Mode Enhancements:**  
  Track chat thread state in real-time, support selective recall injection, and enable conversation clustering via memory tags.

- **Profile Manager Enhancements:**  
  Expand inline editing, deletion features, and support for custom role configurations.

- **Context Questions Feature (Planned):**  
  Dynamically load categorized questions from GitHub-hosted JSON files, offering smart suggestions near the chat input.

- **UI/UX Improvements:**  
  Enhance the overlay with smart scrolling, draggable panels, and cross-browser support (Firefox, Safari).

- **Emotional Safety Mode:**  
  Refine trigger detection, enhance support alert features, and incorporate calming, supportive protocols.

- **Cross-Browser Compatibility:**  
  Begin Firefox and Safari support rollout with storage fallback handling and manifest compatibility workarounds.

- **Long-Term Vision:**  
  Consider AI-assisted prompt clustering, premium features with extended synchronization capabilities, and publishing on the Chrome Web Store with a dedicated support website.

---

## ❤️ Built for Tinkerers, Memory-Lovers, & Productivity Aficionados

AI Context Vault is your shield against digital forgetfulness—ensuring your interactions, insights, and mental wellness remain yours to own. Commit to the journey, secure your narrative, and empower your future.

_Git commit today—own your memory and protect your mind with CloudBlaze.ai._
