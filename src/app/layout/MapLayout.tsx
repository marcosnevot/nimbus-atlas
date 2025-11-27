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

export const MapLayout: React.FC = () => {
  const setViewport = useMapStore((state) => state.setViewport);
  const setSelectedLocation = useMapStore((state) => state.setSelectedLocation);
  const setMapReady = useMapStore((state) => state.setMapReady);

  const handleViewportChange = (viewport: MapViewport) => {
    setViewport(viewport);
  };

  const handleMapClick = (coords: MapCoordinates) => {
    setSelectedLocation(coords);
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
      </div>
      <div className="na-map-layout__side-panel">
        <SidePanel />
      </div>
    </div>
  );
};
