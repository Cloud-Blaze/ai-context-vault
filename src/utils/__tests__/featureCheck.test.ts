import { isFeatureEnabled } from '../featureCheck';

describe('featureCheck', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should enable all features during active trial', async () => {
    const now = Date.now();
    const installDate = now - 1000 * 60 * 60 * 24 * 15; // 15 days ago

    // @ts-ignore
    global.chrome.storage.local.get.mockImplementation((keys, callback) => {
      callback({ installDate });
    });

    expect(await isFeatureEnabled('githubSync')).toBe(true);
    expect(await isFeatureEnabled('godMode')).toBe(true);
    expect(await isFeatureEnabled('contextAdding')).toBe(true);
    expect(await isFeatureEnabled('bookmarkAdding')).toBe(true);
  });

  it('should disable premium features when trial expires', async () => {
    const now = Date.now();
    const installDate = now - 1000 * 60 * 60 * 24 * 31; // 31 days ago

    // @ts-ignore
    global.chrome.storage.local.get.mockImplementation((keys, callback) => {
      callback({ installDate });
    });

    expect(await isFeatureEnabled('githubSync')).toBe(false);
    expect(await isFeatureEnabled('godMode')).toBe(false);
    expect(await isFeatureEnabled('contextAdding')).toBe(false);
    expect(await isFeatureEnabled('bookmarkAdding')).toBe(false);
  });

  it('should enable all features when hasPaid is true', async () => {
    const now = Date.now();
    const installDate = now - 1000 * 60 * 60 * 24 * 31; // 31 days ago

    // @ts-ignore
    global.chrome.storage.local.get.mockImplementation((keys, callback) => {
      callback({ installDate, hasPaid: true });
    });

    expect(await isFeatureEnabled('githubSync')).toBe(true);
    expect(await isFeatureEnabled('godMode')).toBe(true);
    expect(await isFeatureEnabled('contextAdding')).toBe(true);
    expect(await isFeatureEnabled('bookmarkAdding')).toBe(true);
  });

  it('should enable all features when hasConsentedToAds is true', async () => {
    const now = Date.now();
    const installDate = now - 1000 * 60 * 60 * 24 * 31; // 31 days ago

    // @ts-ignore
    global.chrome.storage.local.get.mockImplementation((keys, callback) => {
      callback({ installDate, hasConsentedToAds: true });
    });

    expect(await isFeatureEnabled('githubSync')).toBe(true);
    expect(await isFeatureEnabled('godMode')).toBe(true);
    expect(await isFeatureEnabled('contextAdding')).toBe(true);
    expect(await isFeatureEnabled('bookmarkAdding')).toBe(true);
  });
}); 