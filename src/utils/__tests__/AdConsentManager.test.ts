import { AdConsentManager } from '../AdConsentManager';

describe('AdConsentManager', () => {
  beforeEach(() => {
    // Clear storage before each test
    chrome.storage.local.clear();
  });

  it('should initialize with no consent', async () => {
    const hasConsent = await AdConsentManager.checkConsentStatus();
    expect(hasConsent).toBe(false);
  });

  it('should toggle consent status', async () => {
    // Toggle on
    await AdConsentManager.toggleAdConsent(true);
    let hasConsent = await AdConsentManager.checkConsentStatus();
    expect(hasConsent).toBe(true);

    // Toggle off
    await AdConsentManager.toggleAdConsent(false);
    hasConsent = await AdConsentManager.checkConsentStatus();
    expect(hasConsent).toBe(false);
  });

  it('should initialize ad tracking when consent is given', async () => {
    const mockInitialize = jest.fn();
    chrome.runtime.sendMessage = mockInitialize;

    await AdConsentManager.toggleAdConsent(true);
    expect(mockInitialize).toHaveBeenCalledWith({ type: 'INITIALIZE_AD_TRACKING' });
  });

  it('should not initialize ad tracking when consent is removed', async () => {
    const mockInitialize = jest.fn();
    chrome.runtime.sendMessage = mockInitialize;

    await AdConsentManager.toggleAdConsent(false);
    expect(mockInitialize).not.toHaveBeenCalled();
  });
}); 