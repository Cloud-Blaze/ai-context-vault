import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { PaymentPrompt } from "../PaymentPrompt";
import { PaymentManager } from "../../utils/PaymentManager";

jest.mock("../../utils/PaymentManager");

describe("PaymentPrompt", () => {
  const mockOnClose = jest.fn();
  const mockOnPaymentComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render the payment prompt", () => {
    render(
      <PaymentPrompt
        isOpen={true}
        onClose={mockOnClose}
        onPaymentComplete={mockOnPaymentComplete}
      />
    );

    expect(screen.getByText("Upgrade to Premium")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Get full access to all features with a one-time payment."
      )
    ).toBeInTheDocument();
    expect(screen.getByText("$19.99")).toBeInTheDocument();
  });

  it("should handle successful purchase", async () => {
    (PaymentManager.initializePayment as jest.Mock).mockResolvedValue(true);

    render(
      <PaymentPrompt
        isOpen={true}
        onClose={mockOnClose}
        onPaymentComplete={mockOnPaymentComplete}
      />
    );

    const purchaseButton = screen.getByText("Purchase Now");
    fireEvent.click(purchaseButton);

    expect(PaymentManager.initializePayment).toHaveBeenCalled();
    expect(PaymentManager.handlePurchaseComplete).toHaveBeenCalled();
    expect(mockOnPaymentComplete).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("should handle failed purchase", async () => {
    (PaymentManager.initializePayment as jest.Mock).mockResolvedValue(false);

    render(
      <PaymentPrompt
        isOpen={true}
        onClose={mockOnClose}
        onPaymentComplete={mockOnPaymentComplete}
      />
    );

    const purchaseButton = screen.getByText("Purchase Now");
    fireEvent.click(purchaseButton);

    expect(PaymentManager.initializePayment).toHaveBeenCalled();
    expect(PaymentManager.handlePurchaseComplete).not.toHaveBeenCalled();
    expect(mockOnPaymentComplete).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it("should handle close button click", () => {
    render(
      <PaymentPrompt
        isOpen={true}
        onClose={mockOnClose}
        onPaymentComplete={mockOnPaymentComplete}
      />
    );

    const closeButton = screen.getByText("Cancel");
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });
});
