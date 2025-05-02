import React from "react";
import { withTrialProtection } from "./withTrialProtection";

interface GodModeToggleProps {
  isEnabled: boolean;
  onToggle: () => void;
}

const GodModeToggleBase: React.FC<GodModeToggleProps> = ({
  isEnabled,
  onToggle,
}) => {
  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={onToggle}
        className={`px-4 py-2 rounded ${
          isEnabled
            ? "bg-green-600 text-white hover:bg-green-700"
            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
        }`}
      >
        {isEnabled ? "God Mode: ON" : "God Mode: OFF"}
      </button>
    </div>
  );
};

export const GodModeToggle = withTrialProtection(GodModeToggleBase, "godMode");
