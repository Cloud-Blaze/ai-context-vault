import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { TrialStatus } from "../TrialStatus";
import { checkTrialStatus } from "../../utils/trialCheck";
import { PaymentManager } from "../../utils/PaymentManager";
import { AdConsentManager } from "../../utils/AdConsentManager";

jest.mock("../../utils/trialCheck");
jest.mock("../../utils/PaymentManager");
jest.mock("../../utils/AdConsentManager");

describe("TrialStatus", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should show active trial status", async () => {
    (checkTrialStatus as jest.Mock).mockResolvedValue({
      isExpired: false,
      daysRemaining: 15,
    });
    (PaymentManager.checkPaymentStatus as jest.Mock).mockResolvedValue(false);
    (AdConsentManager.checkConsentStatus as jest.Mock).mockResolvedValue(false);

    render(<TrialStatus />);

    expect(await screen.findByText("Free Trial Active")).toBeInTheDocument();
    expect(
      await screen.findByText(
        "15 days remaining in your trial. Upgrade to continue using premium features."
      )
    ).toBeInTheDocument();
  });

  it("should show expired trial status", async () => {
    (checkTrialStatus as jest.Mock).mockResolvedValue({
      isExpired: true,
      daysRemaining: 0,
    });
    (PaymentManager.checkPaymentStatus as jest.Mock).mockResolvedValue(false);
    (AdConsentManager.checkConsentStatus as jest.Mock).mockResolvedValue(false);

    render(<TrialStatus />);

    expect(await screen.findByText("Trial Expired")).toBeInTheDocument();
    expect(
      await screen.findByText(
        "Your trial has ended. Upgrade to continue using premium features."
      )
    ).toBeInTheDocument();
  });

  it("should show premium access status", async () => {
    (checkTrialStatus as jest.Mock).mockResolvedValue({
      isExpired: true,
      daysRemaining: 0,
    });
    (PaymentManager.checkPaymentStatus as jest.Mock).mockResolvedValue(true);
    (AdConsentManager.checkConsentStatus as jest.Mock).mockResolvedValue(false);

    render(<TrialStatus />);

    expect(
      await screen.findByText("Premium Access Active")
    ).toBeInTheDocument();
    expect(
      await screen.findByText("Thank you for your support!")
    ).toBeInTheDocument();
  });

  it("should show ad-based access status", async () => {
    (checkTrialStatus as jest.Mock).mockResolvedValue({
      isExpired: true,
      daysRemaining: 0,
    });
    (PaymentManager.checkPaymentStatus as jest.Mock).mockResolvedValue(false);
    (AdConsentManager.checkConsentStatus as jest.Mock).mockResolvedValue(true);

    render(<TrialStatus />);

    expect(
      await screen.findByText("Ad-Based Access Active")
    ).toBeInTheDocument();
    expect(
      await screen.findByText(
        "Premium features enabled with ad-based matching."
      )
    ).toBeInTheDocument();
  });

  it("should show upgrade buttons when trial expired", async () => {
    (checkTrialStatus as jest.Mock).mockResolvedValue({
      isExpired: true,
      daysRemaining: 0,
    });
    (PaymentManager.checkPaymentStatus as jest.Mock).mockResolvedValue(false);
    (AdConsentManager.checkConsentStatus as jest.Mock).mockResolvedValue(false);

    render(<TrialStatus />);

    expect(await screen.findByText("Upgrade Now")).toBeInTheDocument();
    expect(
      await screen.findByText("Enable Ad-Based Access")
    ).toBeInTheDocument();
  });

  it("should not show upgrade buttons when premium access active", async () => {
    (checkTrialStatus as jest.Mock).mockResolvedValue({
      isExpired: true,
      daysRemaining: 0,
    });
    (PaymentManager.checkPaymentStatus as jest.Mock).mockResolvedValue(true);
    (AdConsentManager.checkConsentStatus as jest.Mock).mockResolvedValue(false);

    render(<TrialStatus />);

    expect(screen.queryByText("Upgrade Now")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Enable Ad-Based Access")
    ).not.toBeInTheDocument();
  });
});
