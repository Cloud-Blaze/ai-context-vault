import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { AdConsentPrompt } from "../AdConsentPrompt";
import { AdConsentManager } from "../../utils/AdConsentManager";

jest.mock("../../utils/AdConsentManager");

describe("AdConsentPrompt", () => {
  const mockOnClose = jest.fn();
  const mockOnConsentChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (AdConsentManager.checkConsentStatus as jest.Mock).mockResolvedValue(false);
  });

  it("should render the consent prompt", () => {
    render(
      <AdConsentPrompt
        isOpen={true}
        onClose={mockOnClose}
        onConsentChange={mockOnConsentChange}
      />
    );

    expect(screen.getByText("Ad-Based Feature Access")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Enable ad-based matching to access premium features without payment."
      )
    ).toBeInTheDocument();
  });

  it("should handle consent toggle", async () => {
    render(
      <AdConsentPrompt
        isOpen={true}
        onClose={mockOnClose}
        onConsentChange={mockOnConsentChange}
      />
    );

    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);

    expect(AdConsentManager.toggleAdConsent).toHaveBeenCalledWith(true);
    expect(mockOnConsentChange).toHaveBeenCalledWith(true);
  });

  it("should handle close button click", () => {
    render(
      <AdConsentPrompt
        isOpen={true}
        onClose={mockOnClose}
        onConsentChange={mockOnConsentChange}
      />
    );

    const closeButton = screen.getByText("Close");
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("should initialize with current consent status", async () => {
    (AdConsentManager.checkConsentStatus as jest.Mock).mockResolvedValue(true);

    render(
      <AdConsentPrompt
        isOpen={true}
        onClose={mockOnClose}
        onConsentChange={mockOnConsentChange}
      />
    );

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeChecked();
  });
});
