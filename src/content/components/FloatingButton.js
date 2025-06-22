import React from "react";

const FloatingButton = ({ onClick }) => {
  const iconUrl = chrome.runtime.getURL("icons/icon128.png");

  return (
    <div onClick={onClick} className="floating-action-button">
      <img
        src={iconUrl}
        alt="AI Context Vault Logo"
        className="floating-action-button-icon"
      />
    </div>
  );
};

export default FloatingButton;
