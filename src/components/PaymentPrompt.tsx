import React, { useState } from "react";
import { PaymentManager } from "../utils/PaymentManager";
import { Button } from "@repo/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@repo/ui/components/ui/dialog";

interface PaymentPromptProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentComplete: () => void;
}

export const PaymentPrompt: React.FC<PaymentPromptProps> = ({
  isOpen,
  onClose,
  onPaymentComplete,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePurchase = async () => {
    setIsProcessing(true);
    try {
      const success = await PaymentManager.initializePayment();
      if (success) {
        await PaymentManager.handlePurchaseComplete();
        onPaymentComplete();
        onClose();
      }
    } catch (error) {
      console.error("Payment failed:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Upgrade to Premium</DialogTitle>
          <DialogDescription>
            Get full access to all features with a one-time payment.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Premium Features</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
              <li>Unlimited GitHub sync</li>
              <li>Advanced context management</li>
              <li>Priority support</li>
              <li>No ads</li>
            </ul>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">$19.99</p>
            <p className="text-sm text-gray-500">One-time payment</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handlePurchase} disabled={isProcessing}>
            {isProcessing ? "Processing..." : "Purchase Now"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
