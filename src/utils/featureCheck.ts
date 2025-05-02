import { checkTrialStatus } from './trialCheck';

export async function isFeatureEnabled(featureName: string): Promise<boolean> {
  const status = await checkTrialStatus();
  
  // Always enable features if trial is not expired or user has paid/consented
  if (!status.isExpired || status.isUnlocked) {
    return true;
  }

  // Disable specific features when trial is expired and not unlocked
  const disabledFeatures = [
    'githubSync',
    'godMode',
    'contextAdding',
    'bookmarkAdding'
  ];

  return !disabledFeatures.includes(featureName);
} 