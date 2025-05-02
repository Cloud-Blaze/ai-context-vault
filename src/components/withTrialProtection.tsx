import React, { useState, useEffect } from "react";
import { isFeatureEnabled } from "../utils/featureCheck";
import { FeatureNagScreen } from "./FeatureNagScreen";

interface WithTrialProtectionProps {
  featureName: string;
}

export function withTrialProtection<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  featureName: string
) {
  return function WithTrialProtection(props: P) {
    const [isEnabled, setIsEnabled] = useState(true);
    const [showNag, setShowNag] = useState(false);

    useEffect(() => {
      const checkEnabled = async () => {
        const enabled = await isFeatureEnabled(featureName);
        setIsEnabled(enabled);
        if (!enabled) {
          setShowNag(true);
        }
      };
      checkEnabled();
    }, []);

    if (!isEnabled) {
      return showNag ? (
        <FeatureNagScreen
          featureName={featureName}
          onClose={() => setShowNag(false)}
        />
      ) : null;
    }

    return <WrappedComponent {...props} />;
  };
}
