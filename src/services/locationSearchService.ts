// src/services/locationSearchService.ts

import type { Location } from "../entities/location/location";
import { getApiKeyOrThrow } from "./openWeatherService";

const cache = new Map<string, Location | null>();

interface OpenWeatherDirectGeoResult {
  lat?: number;
  lon?: number;
  name?: unknown;
  country?: unknown;
  timezone?: unknown;
}

export async function searchLocationByName(
  query: string
): Promise<Location | null> {
  const trimmed = query.trim();
  if (!trimmed) {
    return null;
  }

  const cacheKey = trimmed.toLowerCase();
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey) ?? null;
  }

  const apiKey = getApiKeyOrThrow();

  const url = new URL("https://api.openweathermap.org/geo/1.0/direct");
  url.searchParams.set("q", trimmed);
  url.searchParams.set("limit", "1");
  url.searchParams.set("appid", apiKey);

  let response: Response;
  try {
    response = await fetch(url.toString());
  } catch {
    throw new Error("Network error while searching locations");
  }

  if (!response.ok) {
    throw new Error(`Location search failed with status ${response.status}`);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error("Invalid JSON from location search endpoint");
  }

  if (!Array.isArray(payload) || payload.length === 0) {
    cache.set(cacheKey, null);
    return null;
  }

  const raw = payload[0] as OpenWeatherDirectGeoResult;

  const lat = typeof raw.lat === "number" ? raw.lat : NaN;
  const lon = typeof raw.lon === "number" ? raw.lon : NaN;

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error("Location search returned invalid coordinates");
  }

  const location: Location = {
    id: `${lat.toFixed(4)},${lon.toFixed(4)}`,
    lat,
    lon,
    name: typeof raw.name === "string" ? raw.name : undefined,
    countryCode: typeof raw.country === "string" ? raw.country : undefined,
    timezone: typeof raw.timezone === "string" ? raw.timezone : undefined,
    source: "search",
  };

  cache.set(cacheKey, location);
  return location;
}
