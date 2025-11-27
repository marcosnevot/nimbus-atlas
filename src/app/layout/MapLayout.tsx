// src/app/layout/MapLayout.tsx
import React from "react";
import { MapOverlays } from "./MapOverlays";
import { SidePanel } from "./SidePanel";
import { MapPlaceholder } from "../../features/map/MapPlaceholder";

export const MapLayout: React.FC = () => {
  return (
    <div className="na-map-layout">
      <div className="na-map-layout__map-area">
        <MapPlaceholder />
        <MapOverlays />
      </div>
      <SidePanel />
    </div>
  );
};
