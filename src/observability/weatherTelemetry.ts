// src/observability/weatherTelemetry.ts

import type {
  LocationRef,
  WeatherError,
} from "../entities/weather/models";

export interface WeatherApiRequestEvent {
  provider: string;
  operation: string;
  location?: LocationRef;
  timestamp: number;
}

export interface WeatherApiSuccessEvent extends WeatherApiRequestEvent {
  durationMs: number;
}

export interface WeatherApiErrorEvent extends WeatherApiRequestEvent {
  durationMs: number;
  error: WeatherError;
}

export type WeatherDataAspect =
  | "forecast_hourly"
  | "forecast_daily"
  | "alerts";

export interface WeatherDataDegradedEvent {
  provider: string;
  operation: string;
  aspect: WeatherDataAspect;
  reason: string;
  hadInput: boolean;
  hasOutput: boolean;
  timestamp: number;
}

export interface WeatherTelemetrySink {
  onApiRequest?(event: WeatherApiRequestEvent): void;
  onApiSuccess?(event: WeatherApiSuccessEvent): void;
  onApiError?(event: WeatherApiErrorEvent): void;
  onDataDegraded?(event: WeatherDataDegradedEvent): void;
}

const envMode = import.meta.env.MODE ?? "development";
const isDev = envMode !== "production";

/**
 * Coarsen/sanitize a LocationRef before it is sent to telemetry sinks.
 *
 * - Rounds lat/lon to a lower precision to avoid storing precise coordinates.
 * - Keeps only fields that are useful for high-level diagnostics.
 * - Drops identifiers/timezone and any extra fields that could be added later.
 */
function sanitizeLocationForTelemetry(
  location: LocationRef | undefined
): LocationRef | undefined {
  if (!location) {
    return undefined;
  }

  const safeLat =
    typeof location.lat === "number"
      ? Number(location.lat.toFixed(2))
      : location.lat;

  const safeLon =
    typeof location.lon === "number"
      ? Number(location.lon.toFixed(2))
      : location.lon;

  return {
    lat: safeLat,
    lon: safeLon,
    name: location.name,
    countryCode: location.countryCode,
    // Intentionally omitting id, timezone and any other extra fields.
  };
}

/**
 * Returns a shallow copy of the event with a sanitized location.
 * The original event object is left untouched.
 */
function withSanitizedLocation<T extends { location?: LocationRef }>(
  event: T
): T {
  if (!event.location) {
    return event;
  }

  const sanitizedLocation = sanitizeLocationForTelemetry(event.location);

  return {
    ...event,
    location: sanitizedLocation,
  };
}

const defaultSink: WeatherTelemetrySink = {
  onApiRequest(event) {
    if (!isDev) return;
    console.debug("[weather][request]", event);
  },
  onApiSuccess(event) {
    if (!isDev) return;
    console.debug("[weather][success]", event);
  },
  onApiError(event) {
    if (!isDev) return;
    console.debug("[weather][error]", event);
  },
  onDataDegraded(event) {
    if (!isDev) return;
    console.debug("[weather][degraded]", event);
  },
};

let activeSink: WeatherTelemetrySink = defaultSink;

export function setWeatherTelemetrySink(
  sink: WeatherTelemetrySink | null
): void {
  activeSink = sink ?? defaultSink;
}

function getSink(): WeatherTelemetrySink {
  return activeSink;
}

export function trackWeatherApiRequest(
  event: WeatherApiRequestEvent
): void {
  const safeEvent = withSanitizedLocation(event);
  getSink().onApiRequest?.(safeEvent);
}

export function trackWeatherApiSuccess(
  event: WeatherApiSuccessEvent
): void {
  const safeEvent = withSanitizedLocation(event);
  getSink().onApiSuccess?.(safeEvent);
}

export function trackWeatherApiError(
  event: WeatherApiErrorEvent
): void {
  const safeEvent = withSanitizedLocation(event);
  getSink().onApiError?.(safeEvent);
}

export function trackWeatherDataDegraded(
  event: WeatherDataDegradedEvent
): void {
  getSink().onDataDegraded?.(event);
}
