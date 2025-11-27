// src/app/layout/TopBar.tsx
import React from "react";
import { TextField } from "../../ui/TextField";
import { IconButton } from "../../ui/IconButton";

export const TopBar: React.FC = () => {
  return (
    <header className="na-top-bar">
      <div className="na-top-bar__brand">
        <span className="na-top-bar__logo" aria-hidden="true">
          ☁️
        </span>
        <span className="na-top-bar__title">Nimbus Atlas</span>
      </div>

      <div className="na-top-bar__search">
        <TextField
          id="topbar-search"
          placeholder="Search for a location..."
          aria-label="Search for a location"
        />
      </div>

      <div className="na-top-bar__actions">
        <IconButton aria-label="Open settings">
          ⚙️
        </IconButton>
      </div>
    </header>
  );
};
