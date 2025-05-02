import React, { useEffect, useState } from "react";
import { checkTrialStatus, TrialStatusInfo } from "../utils/trialCheck";

export const TrialStatus: React.FC = () => {
  const [status, setStatus] = useState<TrialStatusInfo | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const loadStatus = async () => {
      const trialStatus = await checkTrialStatus();
      setStatus(trialStatus);
      if (trialStatus.isExpired && !trialStatus.isUnlocked) {
        setShowModal(true);
      }
    };
    loadStatus();
  }, []);

  if (!status) return null;

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      {status.isUnlocked ? (
        <div className="text-green-600">
          <h3 className="text-lg font-semibold">Premium Access Active</h3>
          <p>Thank you for supporting AI Context Vault!</p>
        </div>
      ) : (
        <div>
          <h3 className="text-lg font-semibold">
            {status.isExpired ? "Trial Expired" : "Free Trial Active"}
          </h3>
          <p className="text-gray-600">
            {status.isExpired
              ? "Your trial has ended. Please upgrade to continue using premium features."
              : `${status.daysRemaining} days remaining in your trial`}
          </p>
          <div className="mt-4 space-x-4">
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700"
            >
              Upgrade Now
            </button>
            <button
              onClick={() => {
                chrome.storage.local.set({ hasConsentedToAds: true });
                setStatus({ ...status, isUnlocked: true });
              }}
              className="px-4 py-2 text-blue-600 border border-blue-600 rounded hover:bg-blue-50"
            >
              Opt into Ad-Based Matching
            </button>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="p-6 bg-white rounded-lg max-w-md">
            <h2 className="mb-4 text-xl font-bold">Upgrade to Premium</h2>
            <p className="mb-4 text-gray-600">
              Unlock all features for just $9.99 or opt into our ad-based
              matching program.
            </p>
            <div className="space-y-4">
              <button
                onClick={() => {
                  // TODO: Implement Stripe checkout
                  window.open("https://stripe.com/checkout", "_blank");
                }}
                className="w-full px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700"
              >
                Pay with Stripe ($9.99)
              </button>
              <button
                onClick={() => {
                  chrome.storage.local.set({ hasConsentedToAds: true });
                  setStatus({ ...status, isUnlocked: true });
                  setShowModal(false);
                }}
                className="w-full px-4 py-2 text-blue-600 border border-blue-600 rounded hover:bg-blue-50"
              >
                Opt into Ad-Based Matching
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="w-full px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
              >
                Maybe Later
              </button>
            </div>
            <p className="mt-4 text-xs text-gray-500">
              By opting into ad-based matching, you allow AI Context Vault to
              analyze prompt keywords (not outputs or user identities) for the
              purpose of suggesting relevant affiliate links. No personal data
              is sold or shared.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
