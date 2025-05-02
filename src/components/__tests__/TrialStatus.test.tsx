import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { TrialStatus } from "../TrialStatus";

describe("TrialStatus", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should show active trial status", async () => {
    const now = Date.now();
    const installDate = now - 1000 * 60 * 60 * 24 * 15; // 15 days ago

    // @ts-ignore
    global.chrome.storage.local.get.mockImplementation((keys, callback) => {
      callback({ installDate });
    });

    render(<TrialStatus />);

    expect(await screen.findByText("Free Trial Active")).toBeInTheDocument();
    expect(
      await screen.findByText("15 days remaining in your trial")
    ).toBeInTheDocument();
  });

  it("should show expired trial status", async () => {
    const now = Date.now();
    const installDate = now - 1000 * 60 * 60 * 24 * 31; // 31 days ago

    // @ts-ignore
    global.chrome.storage.local.get.mockImplementation((keys, callback) => {
      callback({ installDate });
    });

    render(<TrialStatus />);

    expect(await screen.findByText("Trial Expired")).toBeInTheDocument();
    expect(await screen.findByText("Your trial has ended")).toBeInTheDocument();
  });

  it("should show premium access when hasPaid is true", async () => {
    const now = Date.now();
    const installDate = now - 1000 * 60 * 60 * 24 * 31; // 31 days ago

    // @ts-ignore
    global.chrome.storage.local.get.mockImplementation((keys, callback) => {
      callback({ installDate, hasPaid: true });
    });

    render(<TrialStatus />);

    expect(
      await screen.findByText("Premium Access Active")
    ).toBeInTheDocument();
    expect(
      await screen.findByText("Thank you for supporting AI Context Vault!")
    ).toBeInTheDocument();
  });

  it("should show upgrade modal when clicking upgrade button", async () => {
    const now = Date.now();
    const installDate = now - 1000 * 60 * 60 * 24 * 31; // 31 days ago

    // @ts-ignore
    global.chrome.storage.local.get.mockImplementation((keys, callback) => {
      callback({ installDate });
    });

    render(<TrialStatus />);

    const upgradeButton = await screen.findByText("Upgrade Now");
    fireEvent.click(upgradeButton);

    expect(await screen.findByText("Upgrade to Premium")).toBeInTheDocument();
    expect(
      await screen.findByText("Pay with Stripe ($9.99)")
    ).toBeInTheDocument();
  });

  it("should enable features when opting into ad-based matching", async () => {
    const now = Date.now();
    const installDate = now - 1000 * 60 * 60 * 24 * 31; // 31 days ago

    // @ts-ignore
    global.chrome.storage.local.get.mockImplementation((keys, callback) => {
      callback({ installDate });
    });

    render(<TrialStatus />);

    const optInButton = await screen.findByText("Opt into Ad-Based Matching");
    fireEvent.click(optInButton);

    expect(
      await screen.findByText("Premium Access Active")
    ).toBeInTheDocument();
  });
});
