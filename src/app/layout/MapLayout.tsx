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
  const baseMapStyle = useUiStore((state) => state.baseMapStyle);

  const searchTarget = useMapStore((state) => state.searchTarget);

  const handleViewportChange = (nextViewport: MapViewport) => {
    setViewport(nextViewport);
  };

  const handleMapClick = (location: MapSelectedLocation) => {
    setSelectedLocation(location);

    // Auto-open side panel when clicking the map if it is currently closed
    if (!isSidePanelOpen) {
      openSidePanel();
    }
  };

  const handleMapBackgroundClick = () => {
    // Click outside the visible globe: clear selection, keep panel state as-is
    clearSelectedLocation();
  };

  return (
    <div className="na-map-layout">
      <div
        className="na-map-layout__map-area"
        data-side-panel-open={isSidePanelOpen ? "true" : "false"}
      >
        <MapRoot
          onViewportChange={handleViewportChange}
          onMapClick={handleMapClick}
          onMapReady={setMapReady}
          baseMapStyle={baseMapStyle}
          onMapBackgroundClick={handleMapBackgroundClick}
          focusLocation={searchTarget ?? undefined}
        />
        <MapOverlays />
        <SidePanel isOpen={isSidePanelOpen} />
      </div>
    </div>
  );
};
