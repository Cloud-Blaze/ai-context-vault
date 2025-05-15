import React, { useState, useEffect } from "react";
import { AdConsentManager } from "../utils/AdConsentManager";
import { FeatureController } from "../utils/FeatureController";
import { Button } from "@repo/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@repo/ui/components/ui/dialog";

interface AdConsentPromptProps {
  isOpen: boolean;
  onClose: () => void;
  onConsentChange: (hasConsented: boolean) => void;
}

export const AdConsentPrompt: React.FC<AdConsentPromptProps> = ({
  isOpen,
  onClose,
  onConsentChange,
}) => {
  const [hasConsented, setHasConsented] = useState(false);

  useEffect(() => {
    const checkConsent = async () => {
      const consentStatus = await AdConsentManager.checkConsentStatus();
      setHasConsented(consentStatus);
    };
    checkConsent();
  }, []);

  const handleConsentToggle = async () => {
    const newConsentStatus = !hasConsented;
    await AdConsentManager.toggleConsent(newConsentStatus);
    setHasConsented(newConsentStatus);
    onConsentChange(newConsentStatus);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Ad-Based Feature Access</DialogTitle>
          <DialogDescription>
            Enable ad-based matching to access premium features without payment.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="ad-consent"
              checked={hasConsented}
              onChange={handleConsentToggle}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label
              htmlFor="ad-consent"
              className="text-sm font-medium text-gray-700"
            >
              I agree to enable ad-based matching
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
