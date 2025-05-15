# 🧪 AI Context Vault — Monetization System Testing Guide

## 📋 Testing Overview

This document outlines the comprehensive testing plan for the monetization and trial system implementation. The system includes trial management, payment processing, ad consent, and feature access control.

## 🚀 Test Categories

### 1. Installation and Initial State Testing

```bash
# Fresh Install Test
- Install the extension
- Verify installDate is stored in chrome.storage.local
- Check that all premium features are enabled
- Verify TrialStatus shows "Free Trial Active" with 30 days remaining
```

### 2. Trial Status Testing

```bash
# Trial Period Tests
- Modify installDate to simulate different trial states:
  - Day 1: All features enabled
  - Day 15: All features enabled, 15 days remaining
  - Day 30: All features enabled, 0 days remaining
  - Day 31: Trial expired, features disabled
```

### 3. Payment Flow Testing

```bash
# Payment Integration Tests
- Test PaymentPrompt component:
  - Verify UI elements
  - Test successful payment flow
  - Test failed payment flow
  - Verify hasPaid is stored correctly
```

### 4. Ad Consent Testing

```bash
# Ad Consent Flow Tests
- Test AdConsentPrompt component:
  - Verify UI elements
  - Test consent toggle
  - Verify hasConsentedToAds is stored correctly
  - Test ad tracking initialization
```

### 5. Feature Access Testing

```bash
# Feature Access Control Tests
- Test each premium feature under different conditions:
  - During active trial
  - After trial expiration
  - With payment
  - With ad consent
  - Without any unlock
```

### 6. UI Component Testing

```bash
# Component Integration Tests
- Test TrialStatus component states:
  - Active trial
  - Expired trial
  - Premium access
  - Ad-based access
- Test FeatureToggle component:
  - Loading states
  - Enabled/disabled states
  - Toggle behavior
```

### 7. Storage and Persistence Testing

```bash
# Data Persistence Tests
- Test chrome.storage.local operations:
  - installDate persistence
  - hasPaid persistence
  - hasConsentedToAds persistence
  - Data survives extension reload
```

### 8. Edge Cases and Error Handling

```bash
# Edge Case Tests
- Test with missing storage data
- Test with corrupted storage data
- Test network failures during payment
- Test concurrent operations
```

### 9. Automated Test Suite

```bash
# Run Automated Tests
npm test

# This will run all test files:
- src/utils/__tests__/AdConsentManager.test.ts
- src/utils/__tests__/PaymentManager.test.ts
- src/utils/__tests__/FeatureController.test.ts
- src/components/__tests__/AdConsentPrompt.test.tsx
- src/components/__tests__/PaymentPrompt.test.tsx
- src/components/__tests__/FeatureToggle.test.tsx
- src/components/__tests__/TrialStatus.test.tsx
```

### 10. Manual Testing Checklist

```bash
# Manual Verification
- [ ] Fresh install shows correct trial status
- [ ] Premium features work during trial
- [ ] Payment flow works end-to-end
- [ ] Ad consent flow works end-to-end
- [ ] Features disable correctly after trial
- [ ] UI updates properly on state changes
- [ ] Storage persists correctly
- [ ] Extension reload maintains state
```

### 11. Performance Testing

```bash
# Performance Verification
- Test storage operations speed
- Test UI responsiveness
- Test concurrent operations
- Test memory usage
```

### 12. Security Testing

```bash
# Security Verification
- Verify storage data integrity
- Test payment data handling
- Test ad consent data handling
- Verify no sensitive data exposure
```

## 🛠️ Testing Tools and Setup

### Prerequisites

1. Install dependencies:

```bash
npm install
```

2. Run automated tests:

```bash
npm test
```

### Chrome Developer Tools

For manual testing, use Chrome's developer tools:

```bash
# Open extension's background page
chrome://extensions -> Developer mode -> Inspect views: background page

# Open extension's options page
chrome://extensions -> Developer mode -> Inspect views: options page
```

### Testing Different Trial States

To test different trial states, use Chrome's storage API in the DevTools console:

```javascript
// Set install date to X days ago
chrome.storage.local.set({
  installDate: Date.now() - days * 24 * 60 * 60 * 1000,
});

// Check current trial status
chrome.storage.local.get(
  ["installDate", "hasPaid", "hasConsentedToAds"],
  console.log
);
```

## 📝 Test Results Documentation

Document test results using the following format:

```markdown
### Test Case: [Name]

- Date: [YYYY-MM-DD]
- Tester: [Name]
- Environment: [Chrome Version, OS]
- Steps:
  1. [Step 1]
  2. [Step 2]
  3. [Step 3]
- Expected Result: [Description]
- Actual Result: [Description]
- Status: [Pass/Fail]
- Notes: [Any relevant observations]
```

## 🔄 Continuous Testing

- Run automated tests before each commit
- Perform manual testing for major releases
- Update test cases as new features are added
- Document any new edge cases discovered

## 🚨 Known Issues and Workarounds

Document any known issues and their workarounds:

```markdown
### Issue: [Description]

- Impact: [High/Medium/Low]
- Workaround: [Steps to mitigate]
- Status: [Open/In Progress/Resolved]
```

## 📈 Test Coverage Goals

- Unit Tests: >90% coverage
- Component Tests: All major UI components
- Integration Tests: All feature combinations
- Manual Tests: All user flows
