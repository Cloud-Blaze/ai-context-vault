## 🧹 Prompt Packs System (Planned)

The Prompt Packs system brings curated, categorized, and dynamically loadable prompts into the chat interface — designed for **just-in-time AI guidance**.

It helps people “ask better questions” without needing to know what to ask. No Excel. No overwhelm. Just workflow-focused inspiration and productivity from the vault.

---

### 🔄 Overview

- Structured prompt JSONs are cloud-fetched from GitHub
- Each file is mapped to a subcategory (e.g. `google_seo.json`)
- Packs are grouped into top-level categories (Marketing / Sales, Business, etc.)
- Prompts are delivered as clean question snippets:

```json
[
  { "Q": "How can I optimize SEO for my product landing page?" },
  { "Q": "What is an effective cold outreach strategy for B2B SaaS?" }
]
```

---

### 📁 File Structure

```
📁 prompts/
📄 marketing_sales/
📄   google_seo.json
📄   facebook_ads.json
📄   cold_calling.json
📄 business/
📄   customer_service.json
📄   product_management.json
📄 index.json  ← Top-level category + tab manifest
```

---

### 🧠 UI/UX Plan

- Inline Prompt Button 📌 near chat input
- Opens a **Prompt Picker Overlay**

  - 🕽️ Step 1: Choose Category (dropdown)
  - 🧹 Step 2: Choose Prompt Pack (list)
  - 📋 Step 3: Click a question → auto-inject into chat

- ✨ Bonus:
  - 🔀 “Random Prompt” mode
  - ⭐ Favorite/Pin prompts for reuse
  - ⌛ Recent prompt history
  - 🔍 Optional fuzzy search bar for power users

---

### 💾 Data Fetch Logic

- On overlay open:

  - Load `index.json` once
  - Lazy load individual packs as needed
  - Cache responses in `localStorage` (per version hash)

- All prompt JSONs fetched from GitHub CDN or raw URL

---

### 🧹 Prompt Injection Mechanics

- Prompts are injected into the active chat’s input box
- User can review/edit before sending
- Prompts are treated like “user thought scaffolding” — not final, just a launchpad

---

### 🔧 Implementation Tasks

#### UI Overlay (inject.js)

- [ ] Floating Prompt Button (🧠 or 💡 icon)
- [ ] Modal with:
  - [ ] Category dropdown
  - [ ] Prompt pack list
  - [ ] Injectable question list

#### PromptManager.js (new module)

- [ ] Load `index.json` (category → file mappings)
- [ ] Fetch remote prompt JSON files
- [ ] Fuzzy search over loaded questions
- [ ] Store/cache selected packs locally

#### GitHub Prompt Vault

- [ ] Organize all zips into clean folder structure
- [ ] Upload to public `ai-context-prompts` repo
- [ ] Add version.json for update detection

#### Future Enhancements

- [ ] Allow users to create custom prompt packs
- [ ] GitHub-auth upload of user packs
- [ ] Shareable pack links with preview
- [ ] Smart context-aware suggestions

---

### 🔐 Philosophy

This system is _not_ about flooding people with prompts — it’s about surfacing just the right one, at just the right time. Think “AI intuition assistant.” It should feel lightweight, personal, and frictionless.

---

> "You don’t know what you don’t know." This feature gives people _that_ missing question, the one that starts the next business.
