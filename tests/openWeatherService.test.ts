// tests/openWeatherService.test.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  OpenWeatherService,
  getApiKeyOrThrow,
} from "../src/services/openWeatherService";
import type {
  LocationRef,
  WeatherError,
} from "../src/entities/weather/models";

describe("getApiKeyOrThrow", () => {
  const originalTestApiKey = (globalThis as any).__TEST_OPENWEATHER_API_KEY__;

  afterEach(() => {
    (globalThis as any).__TEST_OPENWEATHER_API_KEY__ = originalTestApiKey;
  });

  it("returns override API key when global test override is set", () => {
    (globalThis as any).__TEST_OPENWEATHER_API_KEY__ = "test-override-key";

    const key = getApiKeyOrThrow();

    expect(key).toBe("test-override-key");
  });
});

describe("OpenWeatherService.fetchWeatherBundle", () => {
  const sampleCurrentResponse = {
    dt: 1700000000,
    main: { temp: 18.5 },
    weather: [{ id: 801, main: "Clouds", description: "few clouds" }],
  };

  const sampleForecastResponse = {
    list: [],
  };

  const originalTestApiKey = (globalThis as any).__TEST_OPENWEATHER_API_KEY__;

  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).__TEST_OPENWEATHER_API_KEY__ = "test-api-key";
    (globalThis as any).fetch = vi.fn();
  });

  afterEach(() => {
    (globalThis as any).fetch = undefined;
    (globalThis as any).__TEST_OPENWEATHER_API_KEY__ = originalTestApiKey;
  });

  it("includes coordinates, units=metric and API key in the request URLs", async () => {
    const fetchMock = (globalThis as any).fetch as vi.Mock;

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => sampleCurrentResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => sampleForecastResponse,
      });

    const service = new OpenWeatherService();

    const location: LocationRef = {
      lat: 40.4,
      lon: -3.7,
      name: "Madrid",
    };

    try {
      await service.fetchWeatherBundle(location);
    } catch {
      // Mapping details are covered elsewhere
    }

    expect(fetchMock).toHaveBeenCalled();

    const urls = fetchMock.mock.calls.map((call) => call[0] as string);

    const urlWithParams =
      urls.find((u) => u.includes("lat=40.4") && u.includes("lon=-3.7")) ??
      urls[0];

    expect(urlWithParams).toContain("lat=40.4");
    expect(urlWithParams).toContain("lon=-3.7");
    expect(urlWithParams).toContain("units=metric");
    expect(urlWithParams).toContain("appid=test-api-key");
  });

  it("throws network error when fetch rejects", async () => {
    const fetchMock = (globalThis as any).fetch as vi.Mock;
    fetchMock.mockRejectedValue(new Error("Network down"));

    const service = new OpenWeatherService();
    const location: LocationRef = { lat: 40.4, lon: -3.7 };

    await expect(service.fetchWeatherBundle(location)).rejects.toMatchObject<
      WeatherError
    >({
      kind: "network",
    });
  });

  it("classifies 429 responses as rate_limit errors", async () => {
    const fetchMock = (globalThis as any).fetch as vi.Mock;
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({ "Retry-After": "60" }),
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => sampleForecastResponse,
      });

    const service = new OpenWeatherService();
    const location: LocationRef = { lat: 40.4, lon: -3.7 };

    await expect(service.fetchWeatherBundle(location)).rejects.toMatchObject<
      WeatherError
    >({
      kind: "rate_limit",
      statusCode: 429,
    });
  });

  it("classifies 5xx responses as http errors", async () => {
    const fetchMock = (globalThis as any).fetch as vi.Mock;
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: new Headers(),
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => sampleForecastResponse,
      });

    const service = new OpenWeatherService();
    const location: LocationRef = { lat: 40.4, lon: -3.7 };

    await expect(service.fetchWeatherBundle(location)).rejects.toMatchObject<
      WeatherError
    >({
      kind: "http",
      statusCode: 500,
    });
  });

  it("classifies 401/403 responses as config errors", async () => {
    const fetchMock = (globalThis as any).fetch as vi.Mock;
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: new Headers(),
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => sampleForecastResponse,
      });

    const service = new OpenWeatherService();
    const location: LocationRef = { lat: 40.4, lon: -3.7 };

    await expect(service.fetchWeatherBundle(location)).rejects.toMatchObject<
      WeatherError
    >({
      kind: "config",
      statusCode: 401,
    });
  });

  it("throws contract error when JSON is invalid", async () => {
    const fetchMock = (globalThis as any).fetch as vi.Mock;
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => {
          throw new Error("invalid json");
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => sampleForecastResponse,
      });

    const service = new OpenWeatherService();
    const location: LocationRef = { lat: 40.4, lon: -3.7 };

    await expect(service.fetchWeatherBundle(location)).rejects.toMatchObject<
      WeatherError
    >({
      kind: "contract",
    });
  });
});
