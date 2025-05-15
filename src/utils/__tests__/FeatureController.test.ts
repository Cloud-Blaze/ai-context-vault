import { FeatureController } from '../FeatureController';
import { PaymentManager } from '../PaymentManager';
import { AdConsentManager } from '../AdConsentManager';
import { checkTrialStatus } from '../trialCheck';

jest.mock('../PaymentManager');
jest.mock('../AdConsentManager');
jest.mock('../trialCheck');

describe('FeatureController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should enable non-premium features regardless of status', async () => {
    const isEnabled = await FeatureController.isFeatureEnabled('nonPremiumFeature');
    expect(isEnabled).toBe(true);
  });

  it('should enable premium features during active trial', async () => {
    (checkTrialStatus as jest.Mock).mockResolvedValue({ isExpired: false });
    (PaymentManager.checkPaymentStatus as jest.Mock).mockResolvedValue(false);
    (AdConsentManager.checkConsentStatus as jest.Mock).mockResolvedValue(false);

    const isEnabled = await FeatureController.isFeatureEnabled('githubSync');
    expect(isEnabled).toBe(true);
  });

  it('should enable premium features with active payment', async () => {
    (checkTrialStatus as jest.Mock).mockResolvedValue({ isExpired: true });
    (PaymentManager.checkPaymentStatus as jest.Mock).mockResolvedValue(true);
    (AdConsentManager.checkConsentStatus as jest.Mock).mockResolvedValue(false);

    const isEnabled = await FeatureController.isFeatureEnabled('githubSync');
    expect(isEnabled).toBe(true);
  });

  it('should enable premium features with ad consent', async () => {
    (checkTrialStatus as jest.Mock).mockResolvedValue({ isExpired: true });
    (PaymentManager.checkPaymentStatus as jest.Mock).mockResolvedValue(false);
    (AdConsentManager.checkConsentStatus as jest.Mock).mockResolvedValue(true);

    const isEnabled = await FeatureController.isFeatureEnabled('githubSync');
    expect(isEnabled).toBe(true);
  });

  it('should disable premium features when trial expired and no payment or consent', async () => {
    (checkTrialStatus as jest.Mock).mockResolvedValue({ isExpired: true });
    (PaymentManager.checkPaymentStatus as jest.Mock).mockResolvedValue(false);
    (AdConsentManager.checkConsentStatus as jest.Mock).mockResolvedValue(false);

    const isEnabled = await FeatureController.isFeatureEnabled('githubSync');
    expect(isEnabled).toBe(false);
  });
}); 