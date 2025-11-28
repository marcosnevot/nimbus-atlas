// src/state/mapStore.ts
import { create } from "zustand";
import type {
  MapViewport,
  MapCoordinates,
} from "../features/map/MapRoot";
import type { MapLayerId } from "../features/map/layers.model";
import { DEFAULT_ACTIVE_LAYERS } from "../features/map/layers.model";

export type MapStoreState = {
  viewport: MapViewport | null;
  isMapReady: boolean;
  selectedLocation: MapCoordinates | null;
  activeLayers: MapLayerId;
  setViewport: (viewport: MapViewport) => void;
  setMapReady: () => void;
  setSelectedLocation: (coords: MapCoordinates) => void;
  clearSelectedLocation: () => void;
  setActiveLayers: (layers: MapLayerId[]) => void;
  toggleLayerVisibility: (layerId: MapLayerId) => void;
};

export const useMapStore = create<MapStoreState>((set) => ({
  viewport: null,
  isMapReady: false,
  selectedLocation: null,
  activeLayers: DEFAULT_ACTIVE_LAYERS,

  setViewport: (viewport) => set({ viewport }),
  setMapReady: () => set({ isMapReady: true }),
  setSelectedLocation: (coords) => set({ selectedLocation: coords }),
  clearSelectedLocation: () => set({ selectedLocation: null }),

  setActiveLayers: (layers) => set({ activeLayers: layers }),

  toggleLayerVisibility: (layerId) =>
    set((state) => {
      const isActive = state.activeLayers.includes(layerId);

      return {
        activeLayers: isActive
          ? state.activeLayers.filter((id) => id !== layerId)
          : [...state.activeLayers, layerId],
      };
    }),
}));
