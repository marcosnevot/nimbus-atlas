// tests/MapRoot.test.tsx
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { MapRoot } from "../src/features/map/MapRoot";

vi.mock("maplibre-gl", () => {
  type Handler = (...args: any[]) => void;

  class FakeMap {
    private handlers: Record<string, Handler[]> = {};

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(_options?: any) {}

    on(event: string, handler: Handler) {
      (this.handlers[event] ??= []).push(handler);

      // Trigger immediately for load & style.load so MapRoot runs its callbacks
      if (event === "load" || event === "style.load") {
        handler({} as any);
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    off(_event?: string, _handler?: Handler) {
      // noop for tests
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

    getBounds() {
      return {
        getWest: () => -10,
        getSouth: () => -10,
        getEast: () => 10,
        getNorth: () => 10,
      };
    }

    // Projection is set from MapRoot when MAP_PROJECTION_TYPE === "globe"
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    setProjection(_projection: any) {
      // noop
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    addControl(_control: unknown, _position?: string) {
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

    expect(handleReady).toHaveBeenCalledTimes(1);
  });
});
