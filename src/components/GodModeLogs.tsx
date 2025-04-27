import React, { useEffect, useState } from "react";
import { GodModeStorage } from "../services/godModeStorage";
import { ScrollArea } from "@repo/ui/components/ui/scroll-area";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/ui/card";
import { Badge } from "@repo/ui/components/ui/badge";
import { Loader2 } from "lucide-react";

interface LogEntry {
  id: string;
  type: "input" | "output";
  content: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export const GodModeLogs: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    const checkEnabledState = () => {
      return new Promise<boolean>((resolve) => {
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

    const handleStorageChange = (changes: {
      [key: string]: chrome.storage.StorageChange;
    }) => {
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
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
        <span className="ml-2 text-gray-500">Loading God Mode logs...</span>
      </div>
    );
  }

  if (!isEnabled) {
    return (
      <Card className="m-4">
        <CardContent className="pt-6">
          <p className="text-gray-500 text-center">
            God Mode is not enabled. Enable it in the extension settings to view
            logs.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="m-4">
      <CardHeader>
        <CardTitle className="text-xl font-bold flex items-center justify-between">
          God Mode Logs
          <Badge variant="secondary" className="text-xs">
            {logs.length} entries
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          {logs.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No logs available</p>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <Card
                  key={log.id}
                  className={`overflow-hidden ${
                    log.type === "input" ? "bg-gray-50" : "bg-white"
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Badge
                        variant={log.type === "input" ? "default" : "secondary"}
                      >
                        {log.type === "input" ? "User Input" : "AI Output"}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-gray-800 whitespace-pre-wrap font-mono text-sm">
                      {log.content}
                    </p>
                    {log.metadata && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <p className="text-xs text-gray-500 mb-1">Metadata:</p>
                        <pre className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
