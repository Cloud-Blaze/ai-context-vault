import '@testing-library/jest-dom';

// Mock chrome.storage.local
const mockStorage = {
  get: jest.fn(),
  set: jest.fn(),
  clear: jest.fn(),
  remove: jest.fn(),
  getBytesInUse: jest.fn(),
  QUOTA_BYTES: 5242880,
};

// @ts-ignore
global.chrome = {
  storage: {
    local: mockStorage,
  },
}; 