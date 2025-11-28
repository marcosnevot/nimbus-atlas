// src/app/layout/MapLayout.tsx
import React from "react";
import { MapOverlays } from "./MapOverlays";
import { SidePanel } from "./SidePanel";
import { MapRoot } from "../../features/map/MapRoot";
import type {
  MapViewport,
  MapCoordinates,
} from "../../features/map/MapRoot";
import { useMapStore } from "../../state/mapStore";
import { useUiStore } from "../../state/uiStore";
import { MOCK_LOCATIONS } from "../../features/map/layers.model";

export const MapLayout: React.FC = () => {
  const setViewport = useMapStore((state) => state.setViewport);
  const setSelectedLocation = useMapStore((state) => state.setSelectedLocation);
  const setMapReady = useMapStore((state) => state.setMapReady);
  const activeLayers = useMapStore((state) => state.activeLayers);
  const isSidePanelOpen = useUiStore((state) => state.isSidePanelOpen);

  const handleViewportChange = (viewport: MapViewport) => {
    setViewport(viewport);
  };

  const handleMapClick = (coords: MapCoordinates) => {
    setSelectedLocation(coords);
  };

  const mockMarkersVisible = activeLayers.includes("mock-markers");
  const markers = mockMarkersVisible
    ? MOCK_LOCATIONS.map((location) => location.coordinates)
    : [];

  return (
    <div className="na-map-layout">
      <div className="na-map-layout__map-area">
        <MapRoot
          markers={markers}
          onViewportChange={handleViewportChange}
          onMapClick={handleMapClick}
          onMapReady={setMapReady}
        />
        <MapOverlays />
        {isSidePanelOpen && <SidePanel />}
      </div>
    </div>
  );
};
