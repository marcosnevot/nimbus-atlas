// src/config/map.config.ts

const MAPTILER_API_KEY = import.meta.env.VITE_MAPTILER_API_KEY ?? "";

const FALLBACK_DEMO_STYLE_URL = "https://demotiles.maplibre.org/style.json";

/**
 * Build a MapTiler style URL for a given mapId.
 * If the API key is missing, we fall back to the MapLibre demo style
 * so local development still works.
 */
function buildMaptilerStyleUrl(mapId: string): string {
  if (!MAPTILER_API_KEY) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn(
        "[map.config] Missing VITE_MAPTILER_API_KEY, falling back to demo style."
      );
    }
    return FALLBACK_DEMO_STYLE_URL;
  }

  return `https://api.maptiler.com/maps/${mapId}/style.json?key=${MAPTILER_API_KEY}`;
}

/**
 * Dark basemap (vector, good for data viz / night mode).
 * Based on MapTiler streets-v2-dark.
 */
export const MAP_STYLE_URL_DARK = buildMaptilerStyleUrl("streets-v2-dark");

/**
 * Satellite + labels basemap (hybrid).
 * Good candidate for globe projection.
 */
export const MAP_STYLE_URL_SATELLITE = buildMaptilerStyleUrl("hybrid");

/**
 * Current map style in use.
 *
 * To test each combo:
 * - Dark + flat:
 *     export const MAP_STYLE_URL = MAP_STYLE_URL_DARK;
 *     export const MAP_USE_GLOBE = false;
 * - Satellite + globe:
 *     export const MAP_STYLE_URL = MAP_STYLE_URL_SATELLITE;
 *     export const MAP_USE_GLOBE = true;
 */
export const MAP_STYLE_URL = MAP_STYLE_URL_DARK;

/**
 * Projection config.
 * MapLibre supports "mercator" and "globe".
 */
export const MAP_USE_GLOBE = true as const;

export const MAP_PROJECTION_TYPE: "mercator" | "globe" = MAP_USE_GLOBE
  ? "globe"
  : "mercator";

export const DEFAULT_MAP_CENTER = {
  lng: -3.7038, // Madrid
  lat: 40.4168,
};

export const DEFAULT_MAP_ZOOM = 4;
export const MIN_MAP_ZOOM = 2;
export const MAX_MAP_ZOOM = 12;
