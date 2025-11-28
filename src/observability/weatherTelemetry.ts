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

const defaultSink: WeatherTelemetrySink = {
  onApiRequest(event) {
    if (!isDev) return;
    // eslint-disable-next-line no-console
    console.debug("[weather][request]", event);
  },
  onApiSuccess(event) {
    if (!isDev) return;
    // eslint-disable-next-line no-console
    console.debug("[weather][success]", event);
  },
  onApiError(event) {
    if (!isDev) return;
    // eslint-disable-next-line no-console
    console.debug("[weather][error]", event);
  },
  onDataDegraded(event) {
    if (!isDev) return;
    // eslint-disable-next-line no-console
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
  getSink().onApiRequest?.(event);
}

export function trackWeatherApiSuccess(
  event: WeatherApiSuccessEvent
): void {
  getSink().onApiSuccess?.(event);
}

export function trackWeatherApiError(
  event: WeatherApiErrorEvent
): void {
  getSink().onApiError?.(event);
}

export function trackWeatherDataDegraded(
  event: WeatherDataDegradedEvent
): void {
  getSink().onDataDegraded?.(event);
}
