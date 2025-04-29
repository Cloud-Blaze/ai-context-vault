import React, { useEffect, useState } from "react";

export const GodModeToggle = () => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [hasPat, setHasPat] = useState(false);
  const [hasUrl, setHasUrl] = useState(false);

  useEffect(() => {
    // Load initial state
    chrome.storage.local.get(
      ["godModeEnabled", "githubPat", "githubUrl"],
      (result) => {
        setIsEnabled(!!result.godModeEnabled);
        setHasPat(!!result.githubPat);
        setHasUrl(!!result.githubUrl);
      }
    );

    // Listen for changes
    const handleStorageChange = (changes) => {
      if (changes.godModeEnabled) {
        setIsEnabled(changes.godModeEnabled.newValue);
      }
      if (changes.githubPat) {
        setHasPat(!!changes.githubPat.newValue);
      }
      if (changes.githubUrl) {
        setHasUrl(!!changes.githubUrl.newValue);
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  const handleToggle = async () => {
    if (!hasPat || !hasUrl) {
      // Open options page if PAT or URL is missing
      chrome.runtime.openOptionsPage();
      return;
    }

    const newState = !isEnabled;
    await chrome.storage.local.set({ godModeEnabled: newState });
    setIsEnabled(newState);
  };

  return (
    <div
      className="flex items-center justify-between p-2 hover:bg-gray-100 cursor-pointer"
      onClick={handleToggle}
    >
      <div className="flex items-center">
        <span className="mr-2">👑 God Mode</span>
        {(!hasPat || !hasUrl) && (
          <span className="text-xs text-red-500">(Configure in settings)</span>
        )}
      </div>
      <div className="relative inline-block w-10 mr-2 align-middle select-none">
        <input
          type="checkbox"
          checked={isEnabled}
          onChange={handleToggle}
          className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
          disabled={!hasPat || !hasUrl}
        />
        <label
          className={`toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer ${
            isEnabled ? "bg-green-500" : ""
          }`}
        />
      </div>
    </div>
  );
};
