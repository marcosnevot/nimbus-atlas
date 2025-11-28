// src/services/openWeatherService.ts

import {
  CurrentWeather,
  ForecastTimeline,
  ForecastSlice,
  WeatherAlert,
  WeatherAlertSeverity,
  WeatherAlertType,
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

const ONE_CALL_BASE_URL = "https://api.openweathermap.org/data/3.0/onecall";

interface OpenWeatherWeatherEntry {
  id: number;
  main: string;
  description: string;
  icon: string;
}

interface OpenWeatherCurrentBlock {
  dt: number;
  temp: number;
  feels_like: number;
  humidity: number;
  pressure: number;
  wind_speed: number;
  wind_deg: number;
  weather: OpenWeatherWeatherEntry[];
}

interface OpenWeatherHourlyEntry {
  dt: number;
  temp: number;
  feels_like?: number;
  humidity?: number;
  pressure?: number;
  wind_speed?: number;
  wind_deg?: number;
  pop?: number; // 0..1
  weather: OpenWeatherWeatherEntry[];
}

interface OpenWeatherDailyTemp {
  day: number;
  min: number;
  max: number;
}

interface OpenWeatherDailyFeelsLike {
  day: number;
}

interface OpenWeatherDailyEntry {
  dt: number;
  temp: OpenWeatherDailyTemp;
  feels_like?: OpenWeatherDailyFeelsLike;
  humidity?: number;
  pressure?: number;
  wind_speed?: number;
  wind_deg?: number;
  pop?: number; // 0..1
  weather: OpenWeatherWeatherEntry[];
}

interface OpenWeatherAlertEntry {
  sender_name?: string;
  event?: string;
  start?: number;
  end?: number;
  description?: string;
  tags?: string[];
}

interface OpenWeatherOneCallResponse {
  lat: number;
  lon: number;
  timezone: string;
  timezone_offset: number;
  current?: OpenWeatherCurrentBlock;
  hourly?: OpenWeatherHourlyEntry[];
  daily?: OpenWeatherDailyEntry[];
  alerts?: OpenWeatherAlertEntry[];
}

export interface WeatherService {
  fetchWeatherBundle(location: LocationRef): Promise<WeatherBundle>;
}

function getApiKeyOrThrow(): string {
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

function buildOneCallUrl(lat: number, lon: number, apiKey: string): string {
  const url = new URL(ONE_CALL_BASE_URL);
  url.searchParams.set("lat", lat.toString());
  url.searchParams.set("lon", lon.toString());
  url.searchParams.set("appid", apiKey);
  url.searchParams.set("units", "metric");
  // Keep hourly/daily/alerts (exclude only minutely)
  url.searchParams.set("exclude", "minutely");
  return url.toString();
}

function mapMainToConditionCode(
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

function toIsoUtc(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toISOString();
}

async function fetchOneCall(
  location: LocationRef
): Promise<OpenWeatherOneCallResponse> {
  const apiKey = getApiKeyOrThrow();
  const url = buildOneCallUrl(location.lat, location.lon, apiKey);

  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    const error: WeatherError = {
      kind: "network",
      message: "Network error while calling OpenWeather One Call endpoint",
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
      message: `OpenWeather HTTP error: ${response.status}`,
      statusCode: response.status,
      retryAfterMs,
    };
    throw error;
  }

  try {
    const json = (await response.json()) as OpenWeatherOneCallResponse;
    return json;
  } catch {
    const error: WeatherError = {
      kind: "contract",
      message: "Invalid JSON from OpenWeather One Call endpoint",
    };
    throw error;
  }
}

function buildDomainLocation(
  requested: LocationRef,
  payload: OpenWeatherOneCallResponse
): LocationRef {
  return {
    ...requested,
    lat: payload.lat ?? requested.lat,
    lon: payload.lon ?? requested.lon,
    timezone: payload.timezone ?? requested.timezone,
  };
}

function buildProviderMetadata(): ProviderMetadata {
  return {
    providerName: "OpenWeatherMap",
    attributionText: "Powered by OpenWeather",
    expectedUpdateIntervalMinutes: 10,
  };
}

function mapCurrent(
  location: LocationRef,
  payload: OpenWeatherOneCallResponse
): CurrentWeather {
  const current = payload.current;
  if (!current) {
    const error: WeatherError = {
      kind: "contract",
      message: "Missing current block in OpenWeather One Call response",
    };
    throw error;
  }

  const weatherEntry = current.weather?.[0];

  const conditionCode: WeatherConditionCode = weatherEntry
    ? mapMainToConditionCode(weatherEntry.main, weatherEntry.id)
    : "other";

  const conditionLabel = weatherEntry?.description ?? "Unknown";

  return {
    location,
    observedAt: toIsoUtc(current.dt),
    temperature: current.temp,
    feelsLike: current.feels_like,
    conditionCode,
    conditionLabel,
    humidity: current.humidity,
    pressure: current.pressure,
    windSpeed: current.wind_speed,
    windDirection: current.wind_deg,
  };
}

function downsampleHourlyTo3h(
  hourly: OpenWeatherHourlyEntry[] | undefined
): OpenWeatherHourlyEntry[] {
  if (!hourly || hourly.length === 0) return [];
  return hourly.filter((_, index) => index % 3 === 0);
}

function mapHourlyToTimeline(
  location: LocationRef,
  hourly: OpenWeatherHourlyEntry[] | undefined
): ForecastTimeline | null {
  const entries = downsampleHourlyTo3h(hourly);
  if (!entries.length) return null;

  const slices: ForecastSlice[] = entries
    .map((entry) => {
      if (typeof entry.dt !== "number" || Number.isNaN(entry.dt)) return null;
      if (typeof entry.temp !== "number" || Number.isNaN(entry.temp))
        return null;

      const weatherEntry = entry.weather?.[0];
      const conditionCode: WeatherConditionCode = weatherEntry
        ? mapMainToConditionCode(weatherEntry.main, weatherEntry.id)
        : "other";

      const conditionLabel = weatherEntry?.description ?? "Unknown";

      const slice: ForecastSlice = {
        timestamp: toIsoUtc(entry.dt),
        temperature: entry.temp,
        conditionCode,
        conditionLabel,
        precipitationProbability:
          typeof entry.pop === "number"
            ? Math.min(Math.max(entry.pop, 0), 1)
            : undefined,
        windSpeed: entry.wind_speed,
        windDirection: entry.wind_deg,
      };

      return slice;
    })
    .filter((s): s is ForecastSlice => s !== null);

  if (!slices.length) return null;

  return {
    location,
    granularity: "3h",
    slices,
  };
}

function mapDailyToTimeline(
  location: LocationRef,
  daily: OpenWeatherDailyEntry[] | undefined
): ForecastTimeline | null {
  if (!daily || daily.length === 0) return null;

  const slices: ForecastSlice[] = daily
    .map((entry) => {
      if (typeof entry.dt !== "number" || Number.isNaN(entry.dt)) return null;
      if (!entry.temp || typeof entry.temp.day !== "number") return null;

      const weatherEntry = entry.weather?.[0];
      const conditionCode: WeatherConditionCode = weatherEntry
        ? mapMainToConditionCode(weatherEntry.main, weatherEntry.id)
        : "other";

      const conditionLabel = weatherEntry?.description ?? "Unknown";

      const slice: ForecastSlice = {
        timestamp: toIsoUtc(entry.dt),
        temperature: entry.temp.day,
        conditionCode,
        conditionLabel,
        precipitationProbability:
          typeof entry.pop === "number"
            ? Math.min(Math.max(entry.pop, 0), 1)
            : undefined,
        windSpeed: entry.wind_speed,
        windDirection: entry.wind_deg,
        minTemperature: entry.temp.min,
        maxTemperature: entry.temp.max,
      };

      return slice;
    })
    .filter((s): s is ForecastSlice => s !== null);

  if (!slices.length) return null;

  return {
    location,
    granularity: "daily",
    slices,
  };
}

function mapAlertSeverity(entry: OpenWeatherAlertEntry): WeatherAlertSeverity {
  const tags = (entry.tags ?? []).map((t) => t.toLowerCase());
  const title = (entry.event ?? "").toLowerCase();
  const desc = (entry.description ?? "").toLowerCase();

  if (
    tags.includes("extreme") ||
    title.includes("red") ||
    desc.includes("red warning")
  ) {
    return "extreme";
  }
  if (
    tags.includes("severe") ||
    title.includes("warning") ||
    desc.includes("warning")
  ) {
    return "severe";
  }
  if (tags.includes("moderate") || title.includes("watch")) {
    return "moderate";
  }
  if (tags.includes("minor") || tags.includes("advisory")) {
    return "minor";
  }
  return "unknown";
}

function mapAlertType(entry: OpenWeatherAlertEntry): WeatherAlertType {
  const title = (entry.event ?? "").toLowerCase();
  const desc = (entry.description ?? "").toLowerCase();
  const tags = (entry.tags ?? []).map((t) => t.toLowerCase());
  const haystack = `${title} ${desc} ${tags.join(" ")}`;

  if (haystack.includes("wind")) return "wind";
  if (haystack.includes("storm") || haystack.includes("thunder"))
    return "storm";
  if (haystack.includes("rain") || haystack.includes("flood")) return "rain";
  if (haystack.includes("snow") || haystack.includes("ice")) return "snow";
  if (haystack.includes("heat")) return "heatwave";
  if (haystack.includes("cold") || haystack.includes("frost"))
    return "coldwave";
  if (haystack.includes("fog")) return "fog";

  return "other";
}

function hashString(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(16);
}

function mapAlerts(
  location: LocationRef,
  alerts: OpenWeatherAlertEntry[] | undefined
): WeatherAlert[] {
  if (!alerts || alerts.length === 0) return [];

  return alerts.map((entry, index) => {
    const title = (entry.event ?? "Weather alert").trim();
    const description = (entry.description ?? "").trim();
    const severity = mapAlertSeverity(entry);
    const alertType = mapAlertType(entry);

    const idBase = `${location.lat.toFixed(2)},${location.lon.toFixed(
      2
    )}:${entry.start ?? "na"}:${title}`;
    const id = `owm-alert:${index}:${hashString(idBase)}`;

    const startsAt =
      typeof entry.start === "number" && !Number.isNaN(entry.start)
        ? toIsoUtc(entry.start)
        : undefined;

    const endsAt =
      typeof entry.end === "number" && !Number.isNaN(entry.end)
        ? toIsoUtc(entry.end)
        : undefined;

    return {
      id,
      alertType,
      severity,
      title,
      description,
      startsAt,
      endsAt,
      locations: [location],
      source: entry.sender_name,
      tags: entry.tags,
    };
  });
}

export class OpenWeatherService implements WeatherService {
  async fetchWeatherBundle(location: LocationRef): Promise<WeatherBundle> {
    const startedAt =
      typeof performance !== "undefined" && performance.now
        ? performance.now()
        : Date.now();

    trackWeatherApiRequest({
      provider: "openweather",
      operation: "onecall_bundle",
      location,
      timestamp: Date.now(),
    });

    try {
      const raw = await fetchOneCall(location);

      const domainLocation = buildDomainLocation(location, raw);
      const provider = buildProviderMetadata();

      const current = mapCurrent(domainLocation, raw);

      const timelines: ForecastTimeline[] = [];
      const hourlyTimeline = mapHourlyToTimeline(domainLocation, raw.hourly);
      const dailyTimeline = mapDailyToTimeline(domainLocation, raw.daily);

      if (hourlyTimeline) {
        timelines.push(hourlyTimeline);
      } else if (raw.hourly && raw.hourly.length > 0) {
        trackWeatherDataDegraded({
          provider: "openweather",
          operation: "onecall_bundle",
          aspect: "forecast_hourly",
          reason: "hourly_input_without_output_timeline",
          hadInput: true,
          hasOutput: false,
          timestamp: Date.now(),
        });
      }

      if (dailyTimeline) {
        timelines.push(dailyTimeline);
      } else if (raw.daily && raw.daily.length > 0) {
        trackWeatherDataDegraded({
          provider: "openweather",
          operation: "onecall_bundle",
          aspect: "forecast_daily",
          reason: "daily_input_without_output_timeline",
          hadInput: true,
          hasOutput: false,
          timestamp: Date.now(),
        });
      }

      const alerts = mapAlerts(domainLocation, raw.alerts);

      if (raw.alerts && raw.alerts.length > 0 && alerts.length === 0) {
        trackWeatherDataDegraded({
          provider: "openweather",
          operation: "onecall_bundle",
          aspect: "alerts",
          reason: "alerts_input_without_output",
          hadInput: true,
          hasOutput: false,
          timestamp: Date.now(),
        });
      }

      const bundle: WeatherBundle = {
        current,
        forecastTimelines: timelines,
        alerts,
        provider,
      };

      const finishedAt =
        typeof performance !== "undefined" && performance.now
          ? performance.now()
          : Date.now();

      trackWeatherApiSuccess({
        provider: "openweather",
        operation: "onecall_bundle",
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
          message: "Unknown error in fetchWeatherBundle",
        } as WeatherError);

      trackWeatherApiError({
        provider: "openweather",
        operation: "onecall_bundle",
        location,
        durationMs: finishedAt - startedAt,
        error,
        timestamp: Date.now(),
      });

      throw error;
    }
  }
}
