// src/app/layout/MapOverlays.tsx
import React from "react";
import { IconButton } from "../../ui/IconButton";
import { useUiStore } from "../../state/uiStore";

export const MapOverlays: React.FC = () => {
  const toggleSidePanel = useUiStore((state) => state.toggleSidePanel);
  const isSidePanelOpen = useUiStore((state) => state.isSidePanelOpen);
  const baseMapStyle = useUiStore((state) => state.baseMapStyle);
  const setBaseMapStyle = useUiStore((state) => state.setBaseMapStyle);

  const sidePanelAriaLabel = isSidePanelOpen
    ? "Hide details panel"
    : "Show details panel";

  return (
    <div className="na-map-overlays">
      {/* Side panel handle anchored to the panel edge */}
      <button
        type="button"
        className={
          "na-side-panel-handle" +
          (isSidePanelOpen
            ? " na-side-panel-handle--open"
            : " na-side-panel-handle--closed")
        }
        onClick={toggleSidePanel}
        aria-label={sidePanelAriaLabel}
      >
        <span className="na-side-panel-handle__icon" aria-hidden="true">
          <svg
            className="na-side-panel-handle__icon-svg"
            viewBox="0 0 24 24"
          >
            {/* Chevron perfectly centered in the 24x24 box */}
            <polyline
              className="na-side-panel-handle__icon-shape"
              points="9 7 15 12 9 17"
            />
          </svg>
        </span>
      </button>

      {/* Bottom-left stack: base map style toggle */}
      <div className="na-map-overlays__stack na-map-overlays__stack--bottom-left">
        <div
          className="na-map-basemap-toggle"
          role="radiogroup"
          aria-label="Base map style"
          data-style={baseMapStyle} 
        >
          <button
            type="button"
            className={
              "na-map-basemap-toggle__button" +
              (baseMapStyle === "dark"
                ? " na-map-basemap-toggle__button--active"
                : "")
            }
            onClick={() => setBaseMapStyle("dark")}
          >
            Map
          </button>
          <button
            type="button"
            className={
              "na-map-basemap-toggle__button" +
              (baseMapStyle === "satellite"
                ? " na-map-basemap-toggle__button--active"
                : "")
            }
            onClick={() => setBaseMapStyle("satellite")}
          >
            Satellite
          </button>
        </div>
      </div>
    </div>
  );
};
