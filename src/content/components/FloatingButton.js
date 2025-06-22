import React, { useState } from "react";

const FloatingButton = ({ onClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  const iconGreyUrl = chrome.runtime.getURL("icons/icon-grey-transparent.png");
  const iconColorUrl = chrome.runtime.getURL(
    "icons/ai-context-vault-transparent.png"
  );

  return (
    <div
      onClick={onClick}
      className="floating-action-button"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <img
        src={isHovered ? iconColorUrl : iconGreyUrl}
        alt="AI Context Vault Logo"
        className="floating-action-button-icon"
      />
    </div>
  );
};

export default FloatingButton;
