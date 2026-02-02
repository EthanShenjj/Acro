// Learn more: https://github.com/testing-library/jest-dom
require('@testing-library/jest-dom');

// Mock ResizeObserver for react-window
global.ResizeObserver = class ResizeObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe() {
    // Mock implementation
  }
  unobserve() {
    // Mock implementation
  }
  disconnect() {
    // Mock implementation
  }
};
