// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock window.URL.createObjectURL
global.URL.createObjectURL = jest.fn();

// Mock window.URL.revokeObjectURL
global.URL.revokeObjectURL = jest.fn();

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {
    this.observe = jest.fn();
    this.unobserve = jest.fn();
    this.disconnect = jest.fn();
  }
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {
    this.observe = jest.fn();
    this.unobserve = jest.fn();
    this.disconnect = jest.fn();
  }
};

// Mock document.createRange
document.createRange = () => {
  const range = new Range();
  range.getBoundingClientRect = jest.fn();
  range.getClientRects = jest.fn(() => ({
    item: () => null,
    length: 0,
  }));
  return range;
};

// Fix React 18 rendering in tests
jest.mock('react-dom/client', () => {
  const original = jest.requireActual('react-dom/client');
  
  return {
    ...original,
    createRoot: (container) => {
      return {
        render(element) {
          require('react-dom').render(element, container);
        },
        unmount() {
          require('react-dom').unmountComponentAtNode(container);
        }
      };
    },
  };
});