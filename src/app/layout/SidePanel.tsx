// src/app/layout/SidePanel.tsx
import React from "react";

export const SidePanel: React.FC = () => {
  return (
    <aside className="na-side-panel">
      <h2 className="na-side-panel__title">Location details</h2>
      <p className="na-side-panel__placeholder">
        Location details and weather insights will appear here in later phases.
      </p>
    </aside>
  );
};
