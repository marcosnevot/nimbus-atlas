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
  const setMapReady = useMapStore((state) => state.setMapReady);
  const isSidePanelOpen = useUiStore((state) => state.isSidePanelOpen);

  const handleViewportChange = (nextViewport: MapViewport) => {
    setViewport(nextViewport);
  };

  const handleMapClick = (location: MapSelectedLocation) => {
    setSelectedLocation(location);
  };

  return (
    <div className="na-map-layout">
      <div className="na-map-layout__map-area">
        <MapRoot
          onViewportChange={handleViewportChange}
          onMapClick={handleMapClick}
          onMapReady={setMapReady}
        />
        <MapOverlays />
        <SidePanel isOpen={isSidePanelOpen} />
      </div>
    </div>
  );
};
