import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverMock;

const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;
HTMLElement.prototype.getBoundingClientRect = function () {
  const rect = originalGetBoundingClientRect.call(this);
  if (rect.width > 0 && rect.height > 0) return rect;

  return {
    ...rect,
    width: rect.width || 800,
    height: rect.height || 400,
    right: rect.left + (rect.width || 800),
    bottom: rect.top + (rect.height || 400),
  };
};

afterEach(() => {
  cleanup();
});