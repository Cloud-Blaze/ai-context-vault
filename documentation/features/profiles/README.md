# AI Context Vault - Profile Manager Documentation

## Overview

The Profile Manager feature in AI Context Vault allows users to create and manage global, AI-agnostic profiles. These profiles can be injected into any AI chat interface, ensuring consistent context for various scenarios (e.g., developer or business contexts).

---

## Storage Schema

Profiles are stored in `chrome.storage.local` with keys formatted as:

```
ctx_profiles_{ALIAS_NAME_WITH_UNDERSCORES}
```

### Profile Data Structure

```typescript
interface ProfileData {
  id: string;
  alias: string;
  prompt: string;
}
```

---

## UI Flow

### Options Page editing area for all profiles goes into (`options.html`)

- **Form Page**:
  - There will be a new form section for adding or editing existing profiles. It will be an option where there is a "No Profile" selected by default and an "Add Profile" blue button that pops up a popup with the alias and prompt textarea this same code will allow an edit of an existing profile.
  - All inputs selected will be an input radio type and when you change to one, it will store the currently selected profile in `ctx_current_profile_selected`. We will use this in the three places I have highlighted and any time someone prompts it will add the profile to the top of the prompt.

#### Validation:

- Prevents creating profiles with duplicate aliases.
