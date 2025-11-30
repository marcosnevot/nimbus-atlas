// tests/weatherTelemetry.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  setWeatherTelemetrySink,
  trackWeatherApiRequest,
  trackWeatherApiSuccess,
  trackWeatherApiError,
  trackWeatherDataDegraded,
  type WeatherTelemetrySink,
  type WeatherApiRequestEvent,
} from "../src/observability/weatherTelemetry";
import type { WeatherError } from "../src/entities/weather/models";

describe("weatherTelemetry", () => {
  const baseRequest: WeatherApiRequestEvent = {
    provider: "openweather",
    operation: "bundle_2_5",
    timestamp: 1234567890,
  };

  beforeEach(() => {
    // Reset to default sink before each test
    setWeatherTelemetrySink(null);
  });

  afterEach(() => {
    setWeatherTelemetrySink(null);
    vi.restoreAllMocks();
  });

  it("routes events to a custom sink when set", () => {
    const sink: WeatherTelemetrySink = {
      onApiRequest: vi.fn(),
      onApiSuccess: vi.fn(),
      onApiError: vi.fn(),
      onDataDegraded: vi.fn(),
    };

    setWeatherTelemetrySink(sink);

    const successEvent = { ...baseRequest, durationMs: 42 };
    const error: WeatherError = {
      kind: "network",
      message: "Network down",
    };
    const errorEvent = { ...baseRequest, durationMs: 10, error };
    const degradedEvent = {
      provider: "openweather",
      operation: "bundle_2_5",
      aspect: "alerts" as const,
      reason: "test_degraded_case",
      hadInput: false,
      hasOutput: false,
      timestamp: 987654321,
    };

    trackWeatherApiRequest(baseRequest);
    trackWeatherApiSuccess(successEvent);
    trackWeatherApiError(errorEvent);
    trackWeatherDataDegraded(degradedEvent);

    expect(sink.onApiRequest).toHaveBeenCalledTimes(1);
    expect(sink.onApiRequest).toHaveBeenCalledWith(baseRequest);

    expect(sink.onApiSuccess).toHaveBeenCalledTimes(1);
    expect(sink.onApiSuccess).toHaveBeenCalledWith(successEvent);

    expect(sink.onApiError).toHaveBeenCalledTimes(1);
    expect(sink.onApiError).toHaveBeenCalledWith(errorEvent);

    expect(sink.onDataDegraded).toHaveBeenCalledTimes(1);
    expect(sink.onDataDegraded).toHaveBeenCalledWith(degradedEvent);
  });

  it("does not throw when sink methods are missing", () => {
    const sink: WeatherTelemetrySink = {};
    setWeatherTelemetrySink(sink);

    const error: WeatherError = {
      kind: "unknown",
      message: "Something went wrong",
    };

    const runAll = () => {
      trackWeatherApiRequest(baseRequest);
      trackWeatherApiSuccess({ ...baseRequest, durationMs: 5 });
      trackWeatherApiError({ ...baseRequest, durationMs: 7, error });
      trackWeatherDataDegraded({
        provider: "openweather",
        operation: "bundle_2_5",
        aspect: "forecast_daily",
        reason: "test_noop_sink",
        hadInput: true,
        hasOutput: false,
        timestamp: 999999,
      });
    };

    expect(runAll).not.toThrow();
  });

  it("falls back to default sink when sink is reset to null", () => {
    const sink: WeatherTelemetrySink = {
      onApiRequest: vi.fn(),
    };
    setWeatherTelemetrySink(sink);

    setWeatherTelemetrySink(null);

    const debugSpy = vi
      .spyOn(console, "debug")
      .mockImplementation(() => {});

    trackWeatherApiRequest(baseRequest);

    expect(debugSpy).toHaveBeenCalled();
  });
});
