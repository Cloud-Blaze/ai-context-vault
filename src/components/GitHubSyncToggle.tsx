import React from "react";
import { withTrialProtection } from "./withTrialProtection";

interface GitHubSyncToggleProps {
  isEnabled: boolean;
  onToggle: () => void;
}

const GitHubSyncToggleBase: React.FC<GitHubSyncToggleProps> = ({
  isEnabled,
  onToggle,
}) => {
  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={onToggle}
        className={`px-4 py-2 rounded ${
          isEnabled
            ? "bg-blue-600 text-white hover:bg-blue-700"
            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
        }`}
      >
        {isEnabled ? "GitHub Sync: ON" : "GitHub Sync: OFF"}
      </button>
    </div>
  );
};

export const GitHubSyncToggle = withTrialProtection(
  GitHubSyncToggleBase,
  "githubSync"
);
