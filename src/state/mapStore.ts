// src/state/mapStore.ts
import { create } from "zustand";
import type {
  MapViewport,
  MapCoordinates,
} from "../features/map/MapRoot";

export type MapStoreState = {
  viewport: MapViewport | null;
  isMapReady: boolean;
  selectedLocation: MapCoordinates | null;
  searchTarget: MapCoordinates | null;

  setViewport: (viewport: MapViewport) => void;
  setMapReady: () => void;
  setSelectedLocation: (coords: MapCoordinates) => void;
  setSearchTarget: (coords: MapCoordinates | null) => void;
  clearSelectedLocation: () => void;
};

export const useMapStore = create<MapStoreState>((set) => ({
  viewport: null,
  isMapReady: false,
  selectedLocation: null,
  searchTarget: null,

  setViewport: (viewport) => set({ viewport }),
  setMapReady: () => set({ isMapReady: true }),
  setSelectedLocation: (coords) => set({ selectedLocation: coords }),
  setSearchTarget: (coords) => set({ searchTarget: coords }),
  clearSelectedLocation: () => set({ selectedLocation: null }),
}));
