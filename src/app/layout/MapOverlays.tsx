// src/app/layout/MapOverlays.tsx
import React from "react";
import { IconButton } from "../../ui/IconButton";
import { useUiStore } from "../../state/uiStore";
import { useMapStore } from "../../state/mapStore";

export const MapOverlays: React.FC = () => {
  const toggleSidePanel = useUiStore((state) => state.toggleSidePanel);
  const toggleLayerVisibility = useMapStore(
    (state) => state.toggleLayerVisibility
  );

  const handleToggleLayers = () => {
    toggleSidePanel();
    toggleLayerVisibility("mock-markers");
  };

  return (
    <div className="na-map-overlays">
      <div className="na-map-overlays__stack">
        <IconButton aria-label="Zoom in">+</IconButton>
        <IconButton aria-label="Zoom out">−</IconButton>
        <IconButton
          aria-label="Toggle layers panel"
          onClick={handleToggleLayers}
        >
          ≡
        </IconButton>
      </div>
    </div>
  );
};
