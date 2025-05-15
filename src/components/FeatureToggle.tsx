import React, { useState, useEffect } from "react";
import { FeatureController } from "../utils/FeatureController";
import { Switch } from "@repo/ui/components/ui/switch";
import { Label } from "@repo/ui/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/ui/card";

interface FeatureToggleProps {
  featureId: string;
  featureName: string;
  description: string;
  onStatusChange?: (isEnabled: boolean) => void;
}

export const FeatureToggle: React.FC<FeatureToggleProps> = ({
  featureId,
  featureName,
  description,
  onStatusChange,
}) => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkFeatureStatus = async () => {
      const enabled = await FeatureController.isFeatureEnabled(featureId);
      setIsEnabled(enabled);
      setIsLoading(false);
    };
    checkFeatureStatus();
  }, [featureId]);

  const handleToggle = async () => {
    if (isLoading) return;

    const newStatus = !isEnabled;
    if (newStatus) {
      await FeatureController.enableFeature(featureId);
    } else {
      await FeatureController.disableFeature(featureId);
    }
    setIsEnabled(newStatus);
    onStatusChange?.(newStatus);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{featureName}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2">
          <Switch
            id={featureId}
            checked={isEnabled}
            onCheckedChange={handleToggle}
            disabled={isLoading}
          />
          <Label htmlFor={featureId}>
            {isLoading ? "Loading..." : isEnabled ? "Enabled" : "Disabled"}
          </Label>
        </div>
      </CardContent>
    </Card>
  );
};
