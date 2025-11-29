// tests/mapStore.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { useMapStore } from "../src/state/mapStore";

describe("mapStore", () => {
  beforeEach(() => {
    // Fully reset store to a known baseline, including all actions
    useMapStore.setState({
      viewport: null,
      isMapReady: false,
      selectedLocation: null,
      activeLayers: ["base", "mock-markers"],
      setViewport: (viewport) =>
        useMapStore.setState((state) => ({ ...state, viewport })),
      setMapReady: () =>
        useMapStore.setState((state) => ({ ...state, isMapReady: true })),
      setSelectedLocation: (coords: any) =>
        useMapStore.setState((state) => ({
          ...state,
          selectedLocation: coords,
        })),
      clearSelectedLocation: () =>
        useMapStore.setState((state) => ({ ...state, selectedLocation: null })),
      setActiveLayers: (layers: any) =>
        useMapStore.setState((state) => ({ ...state, activeLayers: layers })),
      toggleLayerVisibility: (layerId: any) =>
        useMapStore.setState((state) => {
          const isActive = state.activeLayers.includes(layerId);
          return {
            ...state,
            activeLayers: isActive
              ? state.activeLayers.filter((id) => id !== layerId)
              : [...state.activeLayers, layerId],
          };
        }),
    });
  });

  it("initializes with base + mock-markers active", () => {
    const state = useMapStore.getState();
    expect(state.activeLayers).toEqual(["base", "mock-markers"]);
  });

  it("updates viewport with setViewport", () => {
    const viewport = {
      center: { lng: 1, lat: 2 },
      zoom: 4,
      bearing: 0,
      pitch: 0,
    };

    useMapStore.getState().setViewport(viewport);

    expect(useMapStore.getState().viewport).toEqual(viewport);
  });

  it("sets and clears selectedLocation", () => {
    useMapStore.getState().setSelectedLocation({ lng: 10, lat: 20 } as any);
    expect(useMapStore.getState().selectedLocation).toEqual({
      lng: 10,
      lat: 20,
    });

    useMapStore.getState().clearSelectedLocation();
    expect(useMapStore.getState().selectedLocation).toBeNull();
  });

  it("toggles layer visibility", () => {
    const { toggleLayerVisibility } = useMapStore.getState();

    // Turn off mock-markers
    toggleLayerVisibility("mock-markers");
    expect(useMapStore.getState().activeLayers).toEqual(["base"]);

    // Turn it back on
    toggleLayerVisibility("mock-markers");
    expect(useMapStore.getState().activeLayers).toEqual([
      "base",
      "mock-markers",
    ]);
  });
});
