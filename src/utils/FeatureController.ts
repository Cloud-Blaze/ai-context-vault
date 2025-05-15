import { PaymentManager } from './PaymentManager';
import { AdConsentManager } from './AdConsentManager';
import { checkTrialStatus } from './trialCheck';

export class FeatureController {
  private static readonly PREMIUM_FEATURES = new Set([
    'githubSync',
    'godMode',
    'contextAdding',
    'bookmarkAdding'
  ]);

  static async isFeatureEnabled(featureId: string): Promise<boolean> {
    if (!this.PREMIUM_FEATURES.has(featureId)) {
      return true;
    }

    const [hasPaid, hasAdConsent, trialStatus] = await Promise.all([
      PaymentManager.checkPaymentStatus(),
      AdConsentManager.checkConsentStatus(),
      checkTrialStatus()
    ]);

    return hasPaid || hasAdConsent || !trialStatus.isExpired;
  }

  static async enableFeature(featureId: string): Promise<void> {
    // This is a no-op as features are controlled by trial/payment status
    console.log(`Feature ${featureId} enabled`);
  }

  static async disableFeature(featureId: string): Promise<void> {
    // This is a no-op as features are controlled by trial/payment status
    console.log(`Feature ${featureId} disabled`);
  }

  static async updateFeatureAccess(): Promise<void> {
    // This is a no-op as features are controlled by trial/payment status
    console.log('Feature access updated');
  }
} 