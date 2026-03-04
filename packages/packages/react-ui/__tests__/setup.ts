/**
 * Test setup for @comment-md/react-ui
 */

import '@testing-library/jest-dom';

// Mock window.getSelection for SelectionHandler tests
Object.defineProperty(window, 'getSelection', {
  writable: true,
  value: () => ({
    toString: () => '',
    rangeCount: 0,
    isCollapsed: true,
    getRangeAt: () => null,
    removeAllRanges: () => {},
    addRange: () => {},
  }),
});

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
