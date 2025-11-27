// tests/MapRoot.test.tsx
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { MapRoot } from "../src/features/map/MapRoot";

vi.mock("maplibre-gl", () => {
  type Handler = (...args: any[]) => void;

  class FakeMap {
    private handlers: Record<string, Handler[]> = {};

    constructor() {}

    on(event: string, handler: Handler) {
      (this.handlers[event] ??= []).push(handler);

      if (event === "load") {
        handler();
      }
    }

    off() {
      // noop
    }

    remove() {
      // noop
    }

    getCenter() {
      return { lng: 0, lat: 0 };
    }

    getZoom() {
      return 5;
    }

    getBearing() {
      return 0;
    }

    getPitch() {
      return 0;
    }

    addControl(_control: unknown, _position?: string) {
      // noop
    }

    resize() {
      // noop
    }
  }

  class FakeNavigationControl {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(_options?: any) {}
  }

  return {
    default: {
      Map: FakeMap,
      NavigationControl: FakeNavigationControl,
    },
  };
});

describe("MapRoot", () => {
  it("mounts and calls onMapReady callback", () => {
    const handleReady = vi.fn();

    render(<MapRoot onMapReady={handleReady} />);

    expect(handleReady).toHaveBeenCalled();
  });
});
