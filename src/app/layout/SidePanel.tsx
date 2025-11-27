// src/app/layout/SidePanel.tsx
import React from "react";
import { useMapStore } from "../../state/mapStore";

const formatCoord = (value: number) => value.toFixed(4);

export const SidePanel: React.FC = () => {
  const selectedLocation = useMapStore((state) => state.selectedLocation);
  const viewport = useMapStore((state) => state.viewport);

  return (
    <aside className="na-side-panel">
      <h2 className="na-side-panel__title">Location details</h2>

      {!selectedLocation && (
        <p className="na-side-panel__placeholder">
          Click on the map to select a location and see its coordinates here.
        </p>
      )}

      {selectedLocation && (
        <section className="na-side-panel__section">
          <h3 className="na-side-panel__subtitle">Selected location</h3>
          <p className="na-side-panel__coords">
            <span>Latitude: {formatCoord(selectedLocation.lat)}</span>
            <span>Longitude: {formatCoord(selectedLocation.lng)}</span>
          </p>
        </section>
      )}

      {viewport && (
        <section className="na-side-panel__section na-side-panel__section--secondary">
          <h3 className="na-side-panel__subtitle">Current viewport</h3>
          <p className="na-side-panel__viewport-row">
            Zoom: {viewport.zoom.toFixed(2)}
          </p>
        </section>
      )}
    </aside>
  );
};
