// tests/openWeatherService.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OpenWeatherService } from "../src/services/openWeatherService";
import type {
  LocationRef,
  WeatherError,
} from "../src/entities/weather/models";

const sampleResponse = {
  lat: 40.4168,
  lon: -3.7038,
  timezone: "Europe/Madrid",
  timezone_offset: 3600,
  current: {
    dt: 1700000000,
    temp: 18.5,
    feels_like: 18.0,
    humidity: 65,
    pressure: 1015,
    wind_speed: 3.5,
    wind_deg: 250,
    weather: [
      {
        id: 801,
        main: "Clouds",
        description: "few clouds",
        icon: "02d",
      },
    ],
  },
  hourly: [],
  daily: [],
  alerts: [],
};

describe("OpenWeatherService.fetchWeatherBundle", () => {
  const originalTestApiKey = (globalThis as any).__TEST_OPENWEATHER_API_KEY__;

  beforeEach(() => {
    // For tests we force a deterministic API key path (if the service uses it)
    (globalThis as any).__TEST_OPENWEATHER_API_KEY__ = "test-api-key";
  });

  afterEach(() => {
    (globalThis as any).fetch = undefined;
    (globalThis as any).__TEST_OPENWEATHER_API_KEY__ = originalTestApiKey;
    vi.resetAllMocks();
  });

  it("includes coordinates, units=metric and API key in the request URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => sampleResponse,
    });

    (globalThis as any).fetch = fetchMock;

    const service = new OpenWeatherService();

    const location: LocationRef = {
      lat: 40.4,
      lon: -3.7,
      name: "Madrid",
    };

    try {
      await service.fetchWeatherBundle(location);
    } catch {
      // ignore – mapping details are covered in adapter tests
    }

    expect(fetchMock).toHaveBeenCalled();

    const urls = fetchMock.mock.calls.map((call) => call[0] as string);

    const urlWithParams =
      urls.find((u) => u.includes("lat=40.4") && u.includes("lon=-3.7")) ??
      urls[0];

    expect(urlWithParams).toContain("lat=40.4");
    expect(urlWithParams).toContain("lon=-3.7");
    expect(urlWithParams).toContain("units=metric");
    expect(urlWithParams).toContain("appid=");
  });


  it("throws network error when fetch rejects", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("Network down"));
    (globalThis as any).fetch = fetchMock;

    const service = new OpenWeatherService();
    const location: LocationRef = { lat: 40.4, lon: -3.7 };

    await expect(service.fetchWeatherBundle(location)).rejects.toMatchObject<
      WeatherError
    >({
      kind: "network",
    });
  });

  it("throws http error when response is not ok", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      headers: new Headers({ "Retry-After": "60" }),
      json: async () => ({}),
    });

    (globalThis as any).fetch = fetchMock;

    const service = new OpenWeatherService();
    const location: LocationRef = { lat: 40.4, lon: -3.7 };

    await expect(service.fetchWeatherBundle(location)).rejects.toMatchObject<
      WeatherError
    >({
      kind: "rate_limit",
      statusCode: 429,
    });
  });

  it("throws contract error when JSON is invalid", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => {
        throw new Error("invalid json");
      },
    });

    (globalThis as any).fetch = fetchMock;

    const service = new OpenWeatherService();
    const location: LocationRef = { lat: 40.4, lon: -3.7 };

    await expect(service.fetchWeatherBundle(location)).rejects.toMatchObject<
      WeatherError
    >({
      kind: "contract",
    });
  });
});
