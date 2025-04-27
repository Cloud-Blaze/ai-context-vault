import React, { useEffect, useState } from "react";
import { GodModeStorage } from "../services/godModeStorage.js";

export const GodModeLogs = () => {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    const checkEnabledState = () => {
      return new Promise((resolve) => {
        chrome.storage.local.get(["godModeEnabled"], (result) => {
          resolve(!!result.godModeEnabled);
        });
      });
    };

    const loadLogs = async () => {
      try {
        const isGodModeEnabled = await checkEnabledState();
        setIsEnabled(isGodModeEnabled);

        if (!isGodModeEnabled) {
          setIsLoading(false);
          return;
        }

        const storage = GodModeStorage.getInstance();
        const allLogs = await storage.getLogs();
        setLogs(allLogs);
      } catch (error) {
        console.error("Error loading God Mode logs:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadLogs();

    // Listen for changes to enabled state
    const handleStorageChange = (changes) => {
      if (changes.godModeEnabled) {
        setIsEnabled(changes.godModeEnabled.newValue);
        if (changes.godModeEnabled.newValue) {
          loadLogs();
        } else {
          setLogs([]);
        }
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  if (isLoading) {
    return <div className="p-4">Loading God Mode logs...</div>;
  }

  if (!isEnabled) {
    return (
      <div className="p-4">
        <p className="text-gray-500">
          God Mode is not enabled. Enable it in the extension settings to view
          logs.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">God Mode Logs</h2>
      {logs.length === 0 ? (
        <p className="text-gray-500">No logs available</p>
      ) : (
        <div className="space-y-4">
          {logs.map((log) => (
            <div
              key={log.id}
              className={`p-4 rounded-lg ${
                log.type === "input"
                  ? "bg-gray-50 border border-gray-200"
                  : "bg-white border border-gray-200"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  {log.type === "input" ? "User Input" : "AI Output"}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>
              <p className="text-gray-800 whitespace-pre-wrap">{log.content}</p>
              {log.metadata && (
                <div className="mt-2 text-xs text-gray-500">
                  <pre>{JSON.stringify(log.metadata, null, 2)}</pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
