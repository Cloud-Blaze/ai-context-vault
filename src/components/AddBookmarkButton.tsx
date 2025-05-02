import React from "react";
import { withTrialProtection } from "./withTrialProtection";

interface AddBookmarkButtonProps {
  onClick: () => void;
}

const AddBookmarkButtonBase: React.FC<AddBookmarkButtonProps> = ({
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 text-white bg-indigo-600 rounded hover:bg-indigo-700"
    >
      Add Bookmark
    </button>
  );
};

export const AddBookmarkButton = withTrialProtection(
  AddBookmarkButtonBase,
  "bookmarkAdding"
);
