// tests/MapRoot.test.tsx
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { MapRoot } from "../src/features/map/MapRoot";
import maplibregl from "maplibre-gl";

vi.mock("maplibre-gl", () => {
  type Handler = (...args: any[]) => void;
  type HandlersMap = Record<string, Handler[]>;

  const state: { lastMapInstance: any; mockFeatures: any[] } = {
    lastMapInstance: null,
    mockFeatures: [],
  };

  class FakeMap {
    private handlers: HandlersMap = {};
    private canvas: {
      style: Record<string, string>;
      clientWidth: number;
      clientHeight: number;
    };
    private center = { lng: 0, lat: 0 };
    private zoom = 5;
    private bearing = 0;
    private pitch = 0;
    private bounds = { west: -10, south: -10, east: 10, north: 10 };

    constructor(options?: { center?: [number, number]; zoom?: number }) {
      this.canvas = {
        style: { cursor: "" },
        clientWidth: 400,
        clientHeight: 400,
      };

      if (options?.center) {
        this.center = { lng: options.center[0], lat: options.center[1] };
      }
      if (typeof options?.zoom === "number") {
        this.zoom = options.zoom;
      }

      state.lastMapInstance = this;
    }

    on(eventName: string, handler: Handler) {
      if (!this.handlers[eventName]) {
        this.handlers[eventName] = [];
      }
      this.handlers[eventName].push(handler);

      // Simulate immediate "load" so MapRoot calls onMapReady y emite viewport
      if (eventName === "load") {
        handler({} as any);
      }
    }

    off(eventName: string, handler: Handler) {
      const list = this.handlers[eventName];
      if (!list) return;
      this.handlers[eventName] = list.filter((h) => h !== handler);
    }

    trigger(eventName: string, payload: any) {
      const list = this.handlers[eventName];
      if (!list) return;
      list.forEach((handler) => handler(payload));
    }

    getCenter() {
      return this.center;
    }

    getZoom() {
      return this.zoom;
    }

    getBearing() {
      return this.bearing;
    }

    getPitch() {
      return this.pitch;
    }

    getBounds() {
      const { west, south, east, north } = this.bounds;
      return {
        getWest: () => west,
        getSouth: () => south,
        getEast: () => east,
        getNorth: () => north,
      };
    }

    getCanvas() {
      return this.canvas as any;
    }

    queryRenderedFeatures() {
      return state.mockFeatures;
    }

    setStyle(_style: string, _options?: any) {
      // no-op for tests
    }

    addControl(_control: any, _position?: string) {
      // no-op
    }

    hasImage(_id: string) {
      return false;
    }

    addImage(_id: string, _img: any) {
      // no-op
    }

    setProjection(_config: any) {
      // no-op
    }

    easeTo(options: any) {
      if (options?.center && Array.isArray(options.center)) {
        this.center = { lng: options.center[0], lat: options.center[1] };
      }
      if (typeof options?.zoom === "number") {
        this.zoom = options.zoom;
      }
    }

    remove() {
      // no-op
    }
  }

  class FakeNavigationControl {
    constructor(_options?: any) { }
  }

  const helpers = {
    getLastInstance: () => state.lastMapInstance,
    setMockFeatures: (features: any[]) => {
      state.mockFeatures = features;
    },
  };

  const defaultExport = {
    Map: FakeMap,
    NavigationControl: FakeNavigationControl,
    __test: helpers,
  };

  return {
    __esModule: true,
    default: defaultExport,
    Map: FakeMap,
    NavigationControl: FakeNavigationControl,
    __test: helpers,
  };
});

describe("MapRoot", () => {
  it("mounts and calls onMapReady callback", () => {
    const handleReady = vi.fn();

    render(<MapRoot onMapReady={handleReady} />);

    expect(handleReady).toHaveBeenCalledTimes(1);
  });

  it("emits viewport on load and moveend", () => {
    const handleViewportChange = vi.fn();

    render(<MapRoot onViewportChange={handleViewportChange} />);

    // "load" event is triggered automatically by the mock when handler is registered
    expect(handleViewportChange).toHaveBeenCalled();

    const helpers = (maplibregl as any).__test;
    const map = helpers.getLastInstance();
    expect(map).toBeTruthy();

    handleViewportChange.mockClear();

    map.trigger("moveend", {});

    expect(handleViewportChange).toHaveBeenCalledTimes(1);
    const viewport = handleViewportChange.mock.calls[0][0];

    expect(viewport).toMatchObject({
      center: { lng: -3.7038, lat: 40.4168 },
      zoom: 4,
      bearing: 0,
      pitch: 0,
      bounds: {
        west: -10,
        south: -10,
        east: 10,
        north: 10,
      },
    });
  });

  it("invokes onMapClick with place metadata when available", () => {
    const handleClick = vi.fn();

    const helpers = (maplibregl as any).__test;
    helpers.setMockFeatures([
      {
        properties: {
          "name:en": "Madrid",
          iso_3166_1: "ES",
          class: "city",
          population: 1000000,
        },
        layer: { id: "place-city" },
      },
    ]);

    render(<MapRoot onMapClick={handleClick} />);

    const map = helpers.getLastInstance();
    expect(map).toBeTruthy();

    map.trigger("click", {
      lngLat: { lng: -3.7, lat: 40.4 },
      point: { x: 100, y: 100 },
    });

    expect(handleClick).toHaveBeenCalledWith(
      expect.objectContaining({
        lng: -3.7,
        lat: 40.4,
        name: "Madrid",
        countryCode: "ES",
      })
    );
  });

  it("falls back to coordinates when feature inspection throws", () => {
    const handleClick = vi.fn();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => { });

    const helpers = (maplibregl as any).__test;
    helpers.setMockFeatures([]);

    render(<MapRoot onMapClick={handleClick} />);

    const map = helpers.getLastInstance();
    expect(map).toBeTruthy();

    // Force queryRenderedFeatures to throw
    (map as any).queryRenderedFeatures = () => {
      throw new Error("boom");
    };

    map.trigger("click", {
      lngLat: { lng: -3.7, lat: 40.4 },
      point: { x: 100, y: 100 },
    });

    expect(handleClick).toHaveBeenCalledWith(
      expect.objectContaining({
        lng: -3.7,
        lat: 40.4,
        name: undefined,
        countryCode: undefined,
      })
    );
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it("sets pointer cursor when hovering over a clickable place feature", () => {
    const handleClick = vi.fn();
    const helpers = (maplibregl as any).__test;

    helpers.setMockFeatures([
      {
        properties: {
          "name:en": "Madrid",
          iso_3166_1: "ES",
          class: "city",
          population: 1000000,
        },
        layer: { id: "place-city" },
      },
    ]);

    render(<MapRoot onMapClick={handleClick} />);

    const map = helpers.getLastInstance();
    expect(map).toBeTruthy();

    const canvas = map.getCanvas();
    expect(canvas.style.cursor).toBe("");

    map.trigger("mousemove", {
      point: { x: 100, y: 100 },
    });

    expect(canvas.style.cursor).toBe("pointer");
  });

  it("resets cursor when hovering over non-clickable area", () => {
    const handleClick = vi.fn();
    const helpers = (maplibregl as any).__test;

    // First simulate a place feature
    helpers.setMockFeatures([
      {
        properties: {
          "name:en": "Madrid",
          iso_3166_1: "ES",
          class: "city",
        },
        layer: { id: "place-city" },
      },
    ]);

    render(<MapRoot onMapClick={handleClick} />);

    const map = helpers.getLastInstance();
    const canvas = map.getCanvas();

    // Hover over city → pointer
    map.trigger("mousemove", {
      point: { x: 100, y: 100 },
    });
    expect(canvas.style.cursor).toBe("pointer");

    // Now no place features near the cursor
    helpers.setMockFeatures([]);

    map.trigger("mousemove", {
      point: { x: 150, y: 150 },
    });

    expect(canvas.style.cursor).toBe("");
  });
});
