import { useState, useEffect } from 'react';
import { isFeatureEnabled } from '../utils/featureCheck';

export function useFeatureEnabled(featureName: string): boolean {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const checkEnabled = async () => {
      const isEnabled = await isFeatureEnabled(featureName);
      setEnabled(isEnabled);
    };
    checkEnabled();
  }, [featureName]);

  return enabled;
} 