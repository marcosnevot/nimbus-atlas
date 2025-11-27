// src/features/map/MapPlaceholder.tsx
import React from "react";

export const MapPlaceholder: React.FC = () => {
  return (
    <div className="na-map-placeholder">
      <div className="na-map-placeholder__content">
        <p className="na-map-placeholder__title">Map area</p>
        <p className="na-map-placeholder__subtitle">
          The interactive map will be rendered here in Phase 3C.
        </p>
      </div>
    </div>
  );
};
