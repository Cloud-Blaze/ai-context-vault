import React, { useState, useEffect } from "react";
import { checkTrialStatus } from "../utils/trialCheck";
import { PaymentManager } from "../utils/PaymentManager";
import { AdConsentManager } from "../utils/AdConsentManager";
import { Button } from "@repo/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/ui/card";
import { PaymentPrompt } from "./PaymentPrompt";
import { AdConsentPrompt } from "./AdConsentPrompt";

export const TrialStatus: React.FC = () => {
  const [trialStatus, setTrialStatus] = useState<{
    isExpired: boolean;
    daysRemaining: number;
  }>({ isExpired: false, daysRemaining: 0 });
  const [hasPaid, setHasPaid] = useState(false);
  const [hasAdConsent, setHasAdConsent] = useState(false);
  const [showPaymentPrompt, setShowPaymentPrompt] = useState(false);
  const [showAdConsentPrompt, setShowAdConsentPrompt] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      const [status, paid, consent] = await Promise.all([
        checkTrialStatus(),
        PaymentManager.checkPaymentStatus(),
        AdConsentManager.checkConsentStatus(),
      ]);
      setTrialStatus(status);
      setHasPaid(paid);
      setHasAdConsent(consent);
    };
    checkStatus();
  }, []);

  const handlePaymentComplete = async () => {
    setHasPaid(true);
    setShowPaymentPrompt(false);
  };

  const handleAdConsentChange = async (hasConsented: boolean) => {
    setHasAdConsent(hasConsented);
    setShowAdConsentPrompt(false);
  };

  const getStatusMessage = () => {
    if (hasPaid) {
      return "Premium Access Active";
    }
    if (hasAdConsent) {
      return "Ad-Based Access Active";
    }
    if (trialStatus.isExpired) {
      return "Trial Expired";
    }
    return "Free Trial Active";
  };

  const getDescription = () => {
    if (hasPaid) {
      return "Thank you for your support!";
    }
    if (hasAdConsent) {
      return "Premium features enabled with ad-based matching.";
    }
    if (trialStatus.isExpired) {
      return "Your trial has ended. Upgrade to continue using premium features.";
    }
    return `${trialStatus.daysRemaining} days remaining in your trial.`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{getStatusMessage()}</CardTitle>
        <CardDescription>{getDescription()}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasPaid && !hasAdConsent && (
          <div className="flex space-x-2">
            <Button onClick={() => setShowPaymentPrompt(true)}>
              Upgrade Now
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowAdConsentPrompt(true)}
            >
              Enable Ad-Based Access
            </Button>
          </div>
        )}
      </CardContent>
      <PaymentPrompt
        isOpen={showPaymentPrompt}
        onClose={() => setShowPaymentPrompt(false)}
        onPaymentComplete={handlePaymentComplete}
      />
      <AdConsentPrompt
        isOpen={showAdConsentPrompt}
        onClose={() => setShowAdConsentPrompt(false)}
        onConsentChange={handleAdConsentChange}
      />
    </Card>
  );
};
