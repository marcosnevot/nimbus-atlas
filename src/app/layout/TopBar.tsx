// src/app/layout/TopBar.tsx
import React, { useState } from "react";
import { useMapStore } from "../../state/mapStore";
import { useUiStore } from "../../state/uiStore";
import { searchLocationByName } from "../../services/locationSearchService";

export const TopBar: React.FC = () => {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearchChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ): void => {
    setQuery(event.target.value);
    if (error) {
      setError(null);
    }
  };

  const handleSearchSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();

    const trimmed = query.trim();
    if (!trimmed || isSearching) {
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const result = await searchLocationByName(trimmed);

      if (!result) {
        setError("No location was found for that query.");
        return;
      }

      const lng = result.lon;
      const lat = result.lat;

      const { setSelectedLocation, setSearchTarget } = useMapStore.getState();
      const { openSidePanel } = useUiStore.getState();

      // Update selected location for the weather side panel
      setSelectedLocation({
        lng,
        lat,
        name: result.name,
        countryCode: result.countryCode,
      });

      // Let the map camera focus the searched location
      setSearchTarget({ lng, lat });

      // Ensure the side panel is visible
      openSidePanel();
    } catch (err) {
      setError("Location search failed. Please try again.");
      if (import.meta.env.DEV) {
        console.error("[TopBar] Location search failed", err);
      }
    } finally {
      setIsSearching(false);
    }
  };

  const sidePanelSettingsLabel = "Open settings";

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

      <div className="na-top-bar__search" role="search">
        <form onSubmit={handleSearchSubmit}>
          <input
            className="na-text-field__input"
            type="search"
            placeholder="Search for a location..."
            aria-label="Search for a location"
            value={query}
            onChange={handleSearchChange}
            disabled={isSearching}
          />
        </form>
        {error && (
          <p className="na-top-bar__search-error" aria-live="polite">
            {error}
          </p>
        )}
      </div>

      <div className="na-top-bar__actions">
        <button
          type="button"
          className="na-icon-button na-button--ghost"
          aria-label={sidePanelSettingsLabel}
        >
          ⚙️
        </button>
      </div>
    </header>
  );
};
