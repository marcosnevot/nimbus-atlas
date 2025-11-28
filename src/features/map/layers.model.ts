// src/features/map/layers.model.ts
import type { MapCoordinates } from "./MapRoot";

export type MapLayerType = "base" | "raster" | "vector" | "marker-overlay";

export type MapLayerId = "base" | "mock-markers";

export type MapLayer = {
  id: MapLayerId;
  type: MapLayerType;
  label: string;
  visibleByDefault: boolean;
};

export type LocationId = string;

export type LocationViewModel = {
  id: LocationId;
  name: string;
  coordinates: MapCoordinates;
  countryCode?: string;
  description?: string;
};

export type WeatherSummaryViewModel = {
  locationId: LocationId;
  temperatureC?: number;
  condition?: string;
};

export const MOCK_LAYERS: MapLayer[] = [
  {
    id: "base",
    type: "base",
    label: "Base map",
    visibleByDefault: true,
  },
  {
    id: "mock-markers",
    type: "marker-overlay",
    label: "Mock points of interest",
    visibleByDefault: true,
  },
];

export const DEFAULT_ACTIVE_LAYERS: MapLayerId[] = MOCK_LAYERS.filter(
  (layer) => layer.visibleByDefault
).map((layer) => layer.id);

export const MOCK_LOCATIONS: LocationViewModel[] = [
  {
    id: "madrid",
    name: "Madrid",
    coordinates: { lng: -3.7038, lat: 40.4168 },
    countryCode: "ES",
    description: "Mock location for Madrid.",
  },
  {
    id: "london",
    name: "London",
    coordinates: { lng: -0.1276, lat: 51.5074 },
    countryCode: "GB",
    description: "Mock location for London.",
  },
  {
    id: "new-york",
    name: "New York City",
    coordinates: { lng: -74.006, lat: 40.7128 },
    countryCode: "US",
    description: "Mock location for New York City.",
  },
];

export const getLocationById = (
  id: LocationId
): LocationViewModel | undefined => {
  return MOCK_LOCATIONS.find((location) => location.id === id);
};
