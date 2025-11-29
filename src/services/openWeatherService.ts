// src/services/openWeatherService.ts

import {
  CurrentWeather,
  ForecastTimeline,
  ForecastSlice,
  WeatherAlert,
  LocationRef,
  ProviderMetadata,
  WeatherBundle,
  WeatherConditionCode,
  WeatherError,
} from "../entities/weather/models";
import {
  trackWeatherApiRequest,
  trackWeatherApiSuccess,
  trackWeatherApiError,
  trackWeatherDataDegraded,
} from "../observability/weatherTelemetry";

const CURRENT_BASE_URL = "https://api.openweathermap.org/data/2.5/weather";
const FORECAST_BASE_URL = "https://api.openweathermap.org/data/2.5/forecast";

export interface WeatherService {
  fetchWeatherBundle(location: LocationRef): Promise<WeatherBundle>;
}

// ---------- API key & shared helpers ----------

export function getApiKeyOrThrow(): string {
  const testOverride =
    typeof globalThis !== "undefined"
      ? (globalThis as any).__TEST_OPENWEATHER_API_KEY__
      : undefined;

  const apiKey =
    (typeof testOverride === "string" && testOverride.length > 0
      ? testOverride
      : import.meta.env.VITE_OPENWEATHER_API_KEY) || "";

  if (!apiKey) {
    const error: WeatherError = {
      kind: "config",
      message: "Missing VITE_OPENWEATHER_API_KEY environment variable",
    };
    throw error;
  }

  return apiKey;
}

function buildCurrentUrl(lat: number, lon: number, apiKey: string): string {
  const url = new URL(CURRENT_BASE_URL);
  url.searchParams.set("lat", lat.toString());
  url.searchParams.set("lon", lon.toString());
  url.searchParams.set("appid", apiKey);
  url.searchParams.set("units", "metric");
  return url.toString();
}

function buildForecastUrl(lat: number, lon: number, apiKey: string): string {
  const url = new URL(FORECAST_BASE_URL);
  url.searchParams.set("lat", lat.toString());
  url.searchParams.set("lon", lon.toString());
  url.searchParams.set("appid", apiKey);
  url.searchParams.set("units", "metric");
  return url.toString();
}

export function mapMainToConditionCode(
  main: string,
  id: number
): WeatherConditionCode {
  const normalized = main.toLowerCase();

  if (normalized === "thunderstorm") return "storm";
  if (normalized === "drizzle") return "drizzle";
  if (normalized === "rain") return "rain";
  if (normalized === "snow") return "snow";
  if (normalized === "clear") return "clear";
  if (normalized === "clouds") return "cloudy";
  if (normalized === "mist" || normalized === "haze" || normalized === "smoke")
    return "mist";
  if (normalized === "fog") return "fog";

  if (id >= 200 && id < 300) return "storm";
  if (id >= 300 && id < 600) return "rain";
  if (id >= 600 && id < 700) return "snow";
  if (id >= 700 && id < 800) return "mist";
  if (id === 800) return "clear";
  if (id > 800 && id < 900) return "cloudy";

  return "other";
}

export function toIsoUtc(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toISOString();
}

function buildProviderMetadata(): ProviderMetadata {
  return {
    providerName: "OpenWeatherMap",
    attributionText: "Powered by OpenWeather (2.5)",
    expectedUpdateIntervalMinutes: 10,
  };
}

// ---------- 2.5 API response types ----------

interface OpenWeatherWeatherEntry {
  id: number;
  main: string;
  description: string;
  icon: string;
}

interface OpenWeather2_5WeatherResponse {
  coord?: {
    lon?: number;
    lat?: number;
  };
  weather?: OpenWeatherWeatherEntry[];
  main?: {
    temp?: number;
    feels_like?: number;
    humidity?: number;
    pressure?: number;
  };
  wind?: {
    speed?: number;
    deg?: number;
  };
  dt?: number;
  sys?: {
    country?: string;
  };
  timezone?: number;
  name?: string;
}

interface OpenWeather2_5ForecastEntry {
  dt?: number;
  main?: {
    temp?: number;
    temp_min?: number;
    temp_max?: number;
    humidity?: number;
    pressure?: number;
  };
  weather?: OpenWeatherWeatherEntry[];
  wind?: {
    speed?: number;
    deg?: number;
  };
  pop?: number;
}

interface OpenWeather2_5ForecastResponse {
  list?: OpenWeather2_5ForecastEntry[];
  city?: {
    coord?: {
      lat?: number;
      lon?: number;
    };
    name?: string;
    country?: string;
  };
}

// ---------- Low-level fetchers (2.5 endpoints) ----------

async function fetchCurrent2_5(
  location: LocationRef,
  apiKey: string
): Promise<OpenWeather2_5WeatherResponse> {
  const url = buildCurrentUrl(location.lat, location.lon, apiKey);

  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    const error: WeatherError = {
      kind: "network",
      message:
        "Network error while calling OpenWeather current weather endpoint (2.5)",
    };
    throw error;
  }

  if (!response.ok) {
    const retryAfterHeader = response.headers.get("Retry-After");
    const retryAfterMs = retryAfterHeader
      ? Number(retryAfterHeader) * 1000
      : undefined;

    const error: WeatherError = {
      kind: response.status === 429 ? "rate_limit" : "http",
      message: `OpenWeather HTTP error (current 2.5): ${response.status}`,
      statusCode: response.status,
      retryAfterMs,
    };
    throw error;
  }

  try {
    const json = (await response.json()) as OpenWeather2_5WeatherResponse;
    return json;
  } catch {
    const error: WeatherError = {
      kind: "contract",
      message:
        "Invalid JSON from OpenWeather current weather endpoint (2.5)",
    };
    throw error;
  }
}

async function fetchForecast2_5(
  location: LocationRef,
  apiKey: string
): Promise<OpenWeather2_5ForecastResponse> {
  const url = buildForecastUrl(location.lat, location.lon, apiKey);

  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    const error: WeatherError = {
      kind: "network",
      message:
        "Network error while calling OpenWeather forecast endpoint (2.5)",
    };
    throw error;
  }

  if (!response.ok) {
    const retryAfterHeader = response.headers.get("Retry-After");
    const retryAfterMs = retryAfterHeader
      ? Number(retryAfterHeader) * 1000
      : undefined;

    const error: WeatherError = {
      kind: response.status === 429 ? "rate_limit" : "http",
      message: `OpenWeather HTTP error (forecast 2.5): ${response.status}`,
      statusCode: response.status,
      retryAfterMs,
    };
    throw error;
  }

  try {
    const json = (await response.json()) as OpenWeather2_5ForecastResponse;
    return json;
  } catch {
    const error: WeatherError = {
      kind: "contract",
      message:
        "Invalid JSON from OpenWeather forecast endpoint (2.5)",
    };
    throw error;
  }
}

// ---------- Mapping helpers ----------

function buildDomainLocationFromCurrent(
  requested: LocationRef,
  payload: OpenWeather2_5WeatherResponse
): LocationRef {
  const coord = payload.coord ?? {};
  return {
    ...requested,
    lat:
      typeof coord.lat === "number" && !Number.isNaN(coord.lat)
        ? coord.lat
        : requested.lat,
    lon:
      typeof coord.lon === "number" && !Number.isNaN(coord.lon)
        ? coord.lon
        : requested.lon,
    name: payload.name ?? requested.name,
    countryCode: payload.sys?.country ?? requested.countryCode,
    // 2.5 only exposes numeric timezone offset; we keep the existing timezone string if any.
    timezone: requested.timezone,
  };
}

function mapCurrentFrom2_5(
  location: LocationRef,
  payload: OpenWeather2_5WeatherResponse
): CurrentWeather {
  const main = payload.main;
  const dt = payload.dt;

  if (
    !main ||
    typeof main.temp !== "number" ||
    Number.isNaN(main.temp) ||
    typeof dt !== "number" ||
    Number.isNaN(dt)
  ) {
    const error: WeatherError = {
      kind: "contract",
      message: "Missing fields in OpenWeather current weather response (2.5)",
    };
    throw error;
  }

  const weatherEntry = payload.weather?.[0];

  const conditionCode: WeatherConditionCode = weatherEntry
    ? mapMainToConditionCode(weatherEntry.main, weatherEntry.id)
    : "other";

  const conditionLabel = weatherEntry?.description ?? "Unknown";

  return {
    location,
    observedAt: toIsoUtc(dt),
    temperature: main.temp,
    feelsLike: main.feels_like,
    conditionCode,
    conditionLabel,
    humidity: main.humidity,
    pressure: main.pressure,
    windSpeed: payload.wind?.speed,
    windDirection: payload.wind?.deg,
  };
}

function mapForecastTimelinesFrom2_5(
  location: LocationRef,
  payload: OpenWeather2_5ForecastResponse
): ForecastTimeline[] {
  const entries = payload.list ?? [];
  if (!entries.length) {
    return [];
  }

  const slices3h: ForecastSlice[] = entries
    .map((entry) => {
      if (
        typeof entry.dt !== "number" ||
        Number.isNaN(entry.dt) ||
        !entry.main ||
        typeof entry.main.temp !== "number" ||
        Number.isNaN(entry.main.temp)
      ) {
        return null;
      }

      const weatherEntry = entry.weather?.[0];
      const conditionCode: WeatherConditionCode = weatherEntry
        ? mapMainToConditionCode(weatherEntry.main, weatherEntry.id)
        : "other";

      const conditionLabel = weatherEntry?.description ?? "Unknown";

      const slice: ForecastSlice = {
        timestamp: toIsoUtc(entry.dt),
        temperature: entry.main.temp,
        conditionCode,
        conditionLabel,
        precipitationProbability:
          typeof entry.pop === "number"
            ? Math.min(Math.max(entry.pop, 0), 1)
            : undefined,
        windSpeed: entry.wind?.speed,
        windDirection: entry.wind?.deg,
        minTemperature: entry.main.temp_min,
        maxTemperature: entry.main.temp_max,
      };

      return slice;
    })
    .filter((s): s is ForecastSlice => s !== null);

  const timelines: ForecastTimeline[] = [];

  if (slices3h.length > 0) {
    timelines.push({
      location,
      granularity: "3h",
      slices: slices3h,
    });
  } else if (entries.length > 0) {
    trackWeatherDataDegraded({
      provider: "openweather",
      operation: "bundle_2_5",
      aspect: "forecast_hourly",
      reason: "forecast_input_without_output_timeline",
      hadInput: true,
      hasOutput: false,
      timestamp: Date.now(),
    });
  }

  const dailyTimeline = buildDailyTimelineFrom3h(location, slices3h);
  if (dailyTimeline) {
    timelines.push(dailyTimeline);
  } else if (slices3h.length > 0) {
    trackWeatherDataDegraded({
      provider: "openweather",
      operation: "bundle_2_5",
      aspect: "forecast_daily",
      reason: "unable_to_aggregate_daily_from_3h",
      hadInput: true,
      hasOutput: false,
      timestamp: Date.now(),
    });
  }

  return timelines;
}

function buildDailyTimelineFrom3h(
  location: LocationRef,
  slices3h: ForecastSlice[]
): ForecastTimeline | null {
  if (!slices3h.length) return null;

  const byDay = new Map<string, ForecastSlice[]>();

  for (const slice of slices3h) {
    const date = new Date(slice.timestamp);
    if (Number.isNaN(date.getTime())) continue;

    const dayKey = date.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
    const existing = byDay.get(dayKey);
    if (existing) {
      existing.push(slice);
    } else {
      byDay.set(dayKey, [slice]);
    }
  }

  const dailySlices: ForecastSlice[] = [];

  for (const [dayKey, daySlices] of byDay) {
    if (!daySlices.length) continue;

    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    const refSlice = daySlices[0];

    for (const s of daySlices) {
      const tempMin =
        typeof s.minTemperature === "number" ? s.minTemperature : s.temperature;
      const tempMax =
        typeof s.maxTemperature === "number" ? s.maxTemperature : s.temperature;

      if (tempMin < min) min = tempMin;
      if (tempMax > max) max = tempMax;
    }

    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      continue;
    }

    const midTimestamp = `${dayKey}T12:00:00.000Z`;

    dailySlices.push({
      timestamp: midTimestamp,
      temperature: (min + max) / 2,
      conditionCode: refSlice.conditionCode,
      conditionLabel: refSlice.conditionLabel,
      precipitationProbability: undefined,
      windSpeed: undefined,
      windDirection: undefined,
      minTemperature: min,
      maxTemperature: max,
    });
  }

  if (!dailySlices.length) {
    return null;
  }

  return {
    location,
    granularity: "daily",
    slices: dailySlices,
  };
}

// ---------- Public service ----------

export class OpenWeatherService implements WeatherService {
  async fetchWeatherBundle(location: LocationRef): Promise<WeatherBundle> {
    const startedAt =
      typeof performance !== "undefined" && performance.now
        ? performance.now()
        : Date.now();

    trackWeatherApiRequest({
      provider: "openweather",
      operation: "bundle_2_5",
      location,
      timestamp: Date.now(),
    });

    try {
      const apiKey = getApiKeyOrThrow();

      const [currentRaw, forecastRaw] = await Promise.all([
        fetchCurrent2_5(location, apiKey),
        fetchForecast2_5(location, apiKey),
      ]);

      const domainLocation = buildDomainLocationFromCurrent(
        location,
        currentRaw
      );

      const current = mapCurrentFrom2_5(domainLocation, currentRaw);
      const timelines = mapForecastTimelinesFrom2_5(
        domainLocation,
        forecastRaw
      );

      const alerts: WeatherAlert[] = [];

      trackWeatherDataDegraded({
        provider: "openweather",
        operation: "bundle_2_5",
        aspect: "alerts",
        reason: "alerts_not_available_in_free_2_5",
        hadInput: false,
        hasOutput: false,
        timestamp: Date.now(),
      });

      const bundle: WeatherBundle = {
        current,
        forecastTimelines: timelines,
        alerts,
        provider: buildProviderMetadata(),
      };

      const finishedAt =
        typeof performance !== "undefined" && performance.now
          ? performance.now()
          : Date.now();

      trackWeatherApiSuccess({
        provider: "openweather",
        operation: "bundle_2_5",
        location: domainLocation,
        durationMs: finishedAt - startedAt,
        timestamp: Date.now(),
      });

      return bundle;
    } catch (e) {
      const finishedAt =
        typeof performance !== "undefined" && performance.now
          ? performance.now()
          : Date.now();

      const error =
        (e as WeatherError) ??
        ({
          kind: "unknown",
          message: "Unknown error in fetchWeatherBundle (2.5)",
        } as WeatherError);

      trackWeatherApiError({
        provider: "openweather",
        operation: "bundle_2_5",
        location,
        durationMs: finishedAt - startedAt,
        error,
        timestamp: Date.now(),
      });

      throw error;
    }
  }
}
