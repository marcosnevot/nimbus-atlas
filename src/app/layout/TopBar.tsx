// src/app/layout/TopBar.tsx
import React from "react";

export const TopBar: React.FC = () => {
  return (
    <header
      className="na-top-bar"
      role="banner"
      aria-label="Nimbus Atlas top bar"
    >
      <div className="na-top-bar__brand">
        <span className="na-top-bar__logo">🌀</span>
        <span className="na-top-bar__title">Nimbus Atlas</span>
      </div>

      <div className="na-top-bar__search">
        <input
          className="na-text-field__input"
          type="search"
          placeholder="Search for a location..."
          aria-label="Search for a location"
        />
      </div>

      <div className="na-top-bar__actions">
        <button
          type="button"
          className="na-icon-button na-button--ghost"
          aria-label="Open settings"
        >
          ⚙️
        </button>
      </div>
    </header>
  );
};
