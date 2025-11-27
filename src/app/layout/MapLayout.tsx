// src/app/layout/MapLayout.tsx
import React from "react";
import { MapOverlays } from "./MapOverlays";
import { SidePanel } from "./SidePanel";
import { MapRoot } from "../../features/map/MapRoot";
import type {
  MapViewport,
  MapCoordinates,
} from "../../features/map/MapRoot";

export const MapLayout: React.FC = () => {
  const handleViewportChange = (viewport: MapViewport) => {
    // TODO Phase 3D: connect with map store (viewport state)
    console.debug("Map viewport changed:", viewport);
  };

  const handleMapClick = (coords: MapCoordinates) => {
    // TODO Phase 3D: connect with selected location state
    console.debug("Map clicked at:", coords);
  };

  return (
    <div className="na-map-layout">
      <div className="na-map-layout__map-area">
        <MapRoot
          onViewportChange={handleViewportChange}
          onMapClick={handleMapClick}
        />
        <MapOverlays />
      </div>
      <div className="na-map-layout__side-panel">
        <SidePanel />
      </div>
    </div>
  );
};
