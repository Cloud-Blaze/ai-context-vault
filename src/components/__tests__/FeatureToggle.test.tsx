import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { FeatureToggle } from "../FeatureToggle";
import { FeatureController } from "../../utils/FeatureController";

jest.mock("../../utils/FeatureController");

describe("FeatureToggle", () => {
  const mockProps = {
    featureId: "testFeature",
    featureName: "Test Feature",
    description: "A test feature for testing",
    onStatusChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render the feature toggle", () => {
    (FeatureController.isFeatureEnabled as jest.Mock).mockResolvedValue(true);

    render(<FeatureToggle {...mockProps} />);

    expect(screen.getByText("Test Feature")).toBeInTheDocument();
    expect(screen.getByText("A test feature for testing")).toBeInTheDocument();
  });

  it("should show loading state initially", () => {
    (FeatureController.isFeatureEnabled as jest.Mock).mockResolvedValue(true);

    render(<FeatureToggle {...mockProps} />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("should show enabled state when feature is enabled", async () => {
    (FeatureController.isFeatureEnabled as jest.Mock).mockResolvedValue(true);

    render(<FeatureToggle {...mockProps} />);

    // Wait for the loading state to resolve
    await screen.findByText("Enabled");
  });

  it("should show disabled state when feature is disabled", async () => {
    (FeatureController.isFeatureEnabled as jest.Mock).mockResolvedValue(false);

    render(<FeatureToggle {...mockProps} />);

    // Wait for the loading state to resolve
    await screen.findByText("Disabled");
  });

  it("should handle toggle when feature is enabled", async () => {
    (FeatureController.isFeatureEnabled as jest.Mock).mockResolvedValue(true);

    render(<FeatureToggle {...mockProps} />);

    // Wait for the loading state to resolve
    await screen.findByText("Enabled");

    const toggle = screen.getByRole("switch");
    fireEvent.click(toggle);

    expect(FeatureController.disableFeature).toHaveBeenCalledWith(
      "testFeature"
    );
    expect(mockProps.onStatusChange).toHaveBeenCalledWith(false);
  });

  it("should handle toggle when feature is disabled", async () => {
    (FeatureController.isFeatureEnabled as jest.Mock).mockResolvedValue(false);

    render(<FeatureToggle {...mockProps} />);

    // Wait for the loading state to resolve
    await screen.findByText("Disabled");

    const toggle = screen.getByRole("switch");
    fireEvent.click(toggle);

    expect(FeatureController.enableFeature).toHaveBeenCalledWith("testFeature");
    expect(mockProps.onStatusChange).toHaveBeenCalledWith(true);
  });
});
