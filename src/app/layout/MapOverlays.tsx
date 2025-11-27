// src/app/layout/MapOverlays.tsx
import React from "react";
import { IconButton } from "../../ui/IconButton";

export const MapOverlays: React.FC = () => {
  return (
    <div className="na-map-overlays">
      <div className="na-map-overlays__stack">
        <IconButton aria-label="Zoom in">+</IconButton>
        <IconButton aria-label="Zoom out">−</IconButton>
      </div>
      <div className="na-map-overlays__stack">
        <IconButton aria-label="Go to my location">◎</IconButton>
        <IconButton aria-label="Toggle layers panel">≡</IconButton>
      </div>
    </div>
  );
};
