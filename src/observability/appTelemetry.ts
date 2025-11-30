// src/observability/appTelemetry.ts

export type AppEventCategory = "ux" | "data" | "error" | "performance";

export type AppEventResult = "success" | "error" | "degraded";

export interface AppEvent {
  eventType: string;
  category: AppEventCategory;
  result?: AppEventResult;
  timestamp: number;
  context?: Record<string, unknown>;
}

export interface AppTelemetrySink {
  onEvent(event: AppEvent): void;
}

const envMode = import.meta.env.MODE ?? "development";
const isDev = envMode !== "production";

const defaultSink: AppTelemetrySink = {
  onEvent(event: AppEvent) {
    if (!isDev) return;
    // eslint-disable-next-line no-console
    console.debug("[app][event]", event);
  },
};

let activeSink: AppTelemetrySink = defaultSink;

export function setAppTelemetrySink(sink: AppTelemetrySink | null): void {
  activeSink = sink ?? defaultSink;
}

export function trackAppEvent(event: AppEvent): void {
  try {
    activeSink.onEvent(event);
  } catch (error) {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.warn("[app][event] sink error", error);
    }
  }
}

export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Minimal logging helper for the frontend.
 * - `debug` is disabled in production builds.
 * - Other levels always go through to the appropriate console method.
 */
export function log(
  level: LogLevel,
  message: string,
  details?: unknown
): void {
  if (level === "debug" && !isDev) {
    return;
  }

  const prefix = `[app][${level}]`;

  // eslint-disable-next-line no-console
  const consoleMethod =
    level === "debug"
      ? console.debug
      : level === "info"
      ? console.info
      : level === "warn"
      ? console.warn
      : console.error;

  if (typeof details === "undefined") {
    consoleMethod(prefix, message);
  } else {
    consoleMethod(prefix, message, details);
  }
}
