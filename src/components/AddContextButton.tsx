import React from "react";
import { withTrialProtection } from "./withTrialProtection";

interface AddContextButtonProps {
  onClick: () => void;
}

const AddContextButtonBase: React.FC<AddContextButtonProps> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 text-white bg-purple-600 rounded hover:bg-purple-700"
    >
      Add Context
    </button>
  );
};

export const AddContextButton = withTrialProtection(
  AddContextButtonBase,
  "contextAdding"
);
