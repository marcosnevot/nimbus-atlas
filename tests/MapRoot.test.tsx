// tests/MapRoot.test.tsx
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { MapRoot } from "../src/features/map/MapRoot";
import maplibregl from "maplibre-gl";

vi.mock("maplibre-gl", () => {
  type Handler = (...args: any[]) => void;
  type HandlersMap = Record<string, Handler[]>;

  const state: {
    lastMapInstance: FakeMap | null;
    mockFeatures: any[];
  } = {
    lastMapInstance: null,
    mockFeatures: [],
  };

  // src/app/layout/MapLayout.tsx
  import React from "react";
  import { MapOverlays } from "./MapOverlays";
  import { SidePanel } from "./SidePanel";
  import { MapRoot } from "../../features/map/MapRoot";
  import type {
    MapViewport,
    MapSelectedLocation,
  } from "../../features/map/MapRoot";
  import { useMapStore } from "../../state/mapStore";
  import { useUiStore } from "../../state/uiStore";

  export const MapLayout: React.FC = () => {
    const setViewport = useMapStore((state) => state.setViewport);
    const setSelectedLocation = useMapStore((state) => state.setSelectedLocation);
    const clearSelectedLocation = useMapStore(
      (state) => state.clearSelectedLocation
    );
    const setMapReady = useMapStore((state) => state.setMapReady);

    const isSidePanelOpen = useUiStore((state) => state.isSidePanelOpen);
    const openSidePanel = useUiStore((state) => state.openSidePanel);

    const handleViewportChange = (nextViewport: MapViewport) => {
      setViewport(nextViewport);
    };

    const handleMapClick = (location: MapSelectedLocation) => {
      setSelectedLocation(location);
      // Any explicit selection should open the side panel
      openSidePanel();
    };

    const handleMapBackgroundClick = () => {
      // Click in "space": clear selection and show the empty state
      clearSelectedLocation();
      openSidePanel();
    };

    return (
      <div className="na-map-layout">
        <div className="na-map-layout__map-area">
          <MapRoot
            onViewportChange={handleViewportChange}
            onMapClick={handleMapClick}
            onMapBackgroundClick={handleMapBackgroundClick}
            onMapReady={setMapReady}
          />
          <MapOverlays />
          <SidePanel isOpen={isSidePanelOpen} />
        </div>
      </div>
    );
  };


  class FakeNavigationControl {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
      center: { lng: 0, lat: 0 },
      zoom: 5,
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

    // Primero simulamos que hay una ciudad
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

    // Hover sobre ciudad → pointer
    map.trigger("mousemove", {
      point: { x: 100, y: 100 },
    });
    expect(canvas.style.cursor).toBe("pointer");

    // Ahora no hay features de lugar cerca
    helpers.setMockFeatures([]);

    map.trigger("mousemove", {
      point: { x: 150, y: 150 },
    });

    expect(canvas.style.cursor).toBe("");
  });
});
