// src/app/layout/MapOverlays.tsx
import React from "react";
import { IconButton } from "../../ui/IconButton";
import { useUiStore } from "../../state/uiStore";

export const MapOverlays: React.FC = () => {
  const toggleSidePanel = useUiStore((state) => state.toggleSidePanel);
  const isSidePanelOpen = useUiStore((state) => state.isSidePanelOpen);

  return (
    <div className="na-map-overlays">
      <div className="na-map-overlays__stack">
        <IconButton
          aria-label={isSidePanelOpen ? "Hide details panel" : "Show details panel"}
          onClick={toggleSidePanel}
          className={isSidePanelOpen ? "na-icon-button--toggled" : undefined}
        >
          ≡
        </IconButton>
      </div>
    </div>
  );
};
