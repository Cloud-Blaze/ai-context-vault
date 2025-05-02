import { checkTrialStatus } from '../trialCheck';

// Mock chrome.storage.local
const mockStorage = {
  get: jest.fn(),
  set: jest.fn(),
};

// @ts-ignore
global.chrome = {
  storage: {
    local: mockStorage,
  },
};

describe('trialCheck', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return correct status for active trial', async () => {
    const now = Date.now();
    const installDate = now - 1000 * 60 * 60 * 24 * 15; // 15 days ago

    mockStorage.get.mockImplementation((keys, callback) => {
      callback({ installDate });
    });

    const status = await checkTrialStatus();
    expect(status.isExpired).toBe(false);
    expect(status.isUnlocked).toBe(false);
    expect(status.daysRemaining).toBe(15);
  });

  it('should return correct status for expired trial', async () => {
    const now = Date.now();
    const installDate = now - 1000 * 60 * 60 * 24 * 31; // 31 days ago

    mockStorage.get.mockImplementation((keys, callback) => {
      callback({ installDate });
    });

    const status = await checkTrialStatus();
    expect(status.isExpired).toBe(true);
    expect(status.isUnlocked).toBe(false);
    expect(status.daysRemaining).toBe(0);
  });

  it('should return unlocked status when hasPaid is true', async () => {
    const now = Date.now();
    const installDate = now - 1000 * 60 * 60 * 24 * 31; // 31 days ago

    mockStorage.get.mockImplementation((keys, callback) => {
      callback({ installDate, hasPaid: true });
    });

    const status = await checkTrialStatus();
    expect(status.isExpired).toBe(true);
    expect(status.isUnlocked).toBe(true);
  });

  it('should return unlocked status when hasConsentedToAds is true', async () => {
    const now = Date.now();
    const installDate = now - 1000 * 60 * 60 * 24 * 31; // 31 days ago

    mockStorage.get.mockImplementation((keys, callback) => {
      callback({ installDate, hasConsentedToAds: true });
    });

    const status = await checkTrialStatus();
    expect(status.isExpired).toBe(true);
    expect(status.isUnlocked).toBe(true);
  });
}); 