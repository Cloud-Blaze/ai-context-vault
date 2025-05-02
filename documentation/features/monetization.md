# 🚨 AI Context Vault — Monetization + Trial System Prompt

🧠 This Chrome Extension needs to implement a **complete trial + monetization system** with the following features:

---

## ✅ High-Level Goals

- [ ] Store `installDate` persistently on first install
- [ ] Track `hasPaid` and `hasConsentedToAds` in `chrome.storage.local`
- [ ] Disable GitHub sync and God Mode when trial expires
- [ ] Provide 30-day free trial with automatic unlock
- [ ] Display Stripe paywall or ad opt-in UI
- [ ] Show nag screen when trial expires and no opt-in chosen
- [ ] Use clean React + Tailwind UI in `Options.tsx`

---

## 🔒 Trial Enforcement Rules

- Install date is stored once and never reset
- Trial = 30 days from `installDate`
- `hasPaid = true` bypasses all checks forever
- `hasConsentedToAds = true` also unlocks features but enables tracking
- After trial expires and no consent is given:
  - GitHub sync, context adding, and when adding a bookmark or context, show the nag screen, God Mode too **stop working**
  - User sees nag screen until decision is made

---

## 🛠 Required Code Changes

### 1. `background.js`

- [ ] On `chrome.runtime.onInstalled`, store `installDate` if not already set

```js
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install") {
    chrome.storage.local.set({ installDate: Date.now() });
  }
});
```

---

### 2. `utils/trialCheck.js`

- [ ] Create utility to check trial status

```js
export async function checkTrialStatus() {
  return new Promise((resolve) => {
    chrome.storage.local.get(
      ["installDate", "hasPaid", "hasConsentedToAds"],
      (res) => {
        const now = Date.now();
        const installDate = res.installDate || now;
        const trialLength = 1000 * 60 * 60 * 24 * 30; // 30 days
        const isExpired = now - installDate > trialLength;
        const isUnlocked = res.hasPaid || res.hasConsentedToAds;
        const daysRemaining = Math.max(
          0,
          Math.floor(
            (trialLength - (now - installDate)) / (1000 * 60 * 60 * 24)
          )
        );

        resolve({ isExpired, isUnlocked, daysRemaining });
      }
    );
  });
}
```

---

### 3. `GodModeToggle.jsx` / `Options.tsx`

- [ ] Add `useEffect` to check trial status and disable feature toggles if trial expired and not unlocked
- [ ] Show Stripe or ad opt-in modal if expired

---

### 4. `Options.tsx` UI (in "General" tab)

- [ ] Add free trial status
- [ ] Show trial countdown (`{daysRemaining} days left`)
- [ ] Two buttons: Pay with Stripe / Opt into Ad-Based Matching

---

## 💸 Stripe Integration (next step)

- [ ] Create `/api/create-checkout-session` serverless function (Vercel, etc.)
- [ ] Store `hasPaid = true` on successful redirect
- [ ] Verify Stripe webhook? (Optional)

---

## 📦 Storage Keys

| Key                    | Type    | Description                         |
| ---------------------- | ------- | ----------------------------------- |
| `installDate`          | number  | Timestamp of first install          |
| `hasPaid`              | boolean | Set `true` if Stripe paid           |
| `hasConsentedToAds`    | boolean | Set `true` if user accepts tracking |
| `trialStatusDismissed` | boolean | For suppressing future nag screens  |

---

## 🧼 UI/UX Notes

- [ ] Clearly link Privacy Policy & Terms
- [ ] If trial expired, show nag screen at every options open
- [ ] Include explanation of ad tracking — e.g., “We analyze your keyword inputs (never your data) to match you with relevant offers.”

---

## 🛑 Feature Enforcement

- [ ] Disable GitHub sync UI after trial ends and no consent
- [ ] Disable God Mode toggle with tooltip: “Unlock required — trial ended”
- [ ] Nag screen: “Trial ended. Unlock full features by paying $9.99 or opting into keyword-based tracking”

---

## 🧪 Test Plan

- [ ] Simulate fresh install — 30-day full access
- [ ] Simulate expired trial with no unlock — show nag, disable features
- [ ] Simulate `hasPaid = true` — full unlock
- [ ] Simulate `hasConsentedToAds = true` — full unlock with tracking consent banner

---

## 📝 Legal Copy Examples

> “By opting in, you allow AI Context Vault to analyze prompt keywords (not outputs or user identities) for the purpose of suggesting relevant affiliate links. No personal data is sold or shared. Full policy: [link]”

---

Let’s build this entire monetization system across background, UI, and sync logic. Cursor — go to town.

```

```
