import React from "react";
import { TrialStatus } from "./TrialStatus";

interface FeatureNagScreenProps {
  featureName: string;
  onClose?: () => void;
}

export const FeatureNagScreen: React.FC<FeatureNagScreenProps> = ({
  featureName,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="p-6 bg-white rounded-lg max-w-md">
        <h2 className="mb-4 text-xl font-bold">Feature Locked</h2>
        <p className="mb-4 text-gray-600">
          {featureName === "githubSync" && "GitHub sync is a premium feature."}
          {featureName === "godMode" && "God Mode is a premium feature."}
          {featureName === "contextAdding" &&
            "Adding context is a premium feature."}
          {featureName === "bookmarkAdding" &&
            "Adding bookmarks is a premium feature."}
        </p>
        <div className="mt-4">
          <TrialStatus />
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="w-full px-4 py-2 mt-4 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
};
