import { PaymentManager } from '../PaymentManager';

describe('PaymentManager', () => {
  beforeEach(() => {
    // Clear storage before each test
    chrome.storage.local.clear();
  });

  it('should initialize with no payment', async () => {
    const hasPaid = await PaymentManager.checkPaymentStatus();
    expect(hasPaid).toBe(false);
  });

  it('should handle successful payment', async () => {
    const mockResponse = { success: true };
    chrome.runtime.sendMessage = jest.fn().mockImplementation((_, callback) => {
      callback(mockResponse);
    });

    const success = await PaymentManager.initializePayment();
    expect(success).toBe(true);

    const hasPaid = await PaymentManager.checkPaymentStatus();
    expect(hasPaid).toBe(true);
  });

  it('should handle failed payment', async () => {
    const mockResponse = { success: false };
    chrome.runtime.sendMessage = jest.fn().mockImplementation((_, callback) => {
      callback(mockResponse);
    });

    const success = await PaymentManager.initializePayment();
    expect(success).toBe(false);

    const hasPaid = await PaymentManager.checkPaymentStatus();
    expect(hasPaid).toBe(false);
  });

  it('should validate license status', async () => {
    // Test with no payment
    let isValid = await PaymentManager.validateLicense();
    expect(isValid).toBe(false);

    // Test with payment
    await PaymentManager.handlePurchaseComplete();
    isValid = await PaymentManager.validateLicense();
    expect(isValid).toBe(true);
  });
}); 