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
    (globalThis as any).__TEST_OPENWEATHER_API_KEY__ = "test-api-key";
  });

  afterEach(() => {
    (globalThis as any).fetch = undefined;
    (globalThis as any).__TEST_OPENWEATHER_API_KEY__ = originalTestApiKey;
    vi.resetAllMocks();
  });

  it("maps a successful OpenWeather response to WeatherBundle", async () => {
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

    const bundle = await service.fetchWeatherBundle(location);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = (fetchMock.mock.calls[0] as any[])[0] as string;
    expect(url).toContain("lat=40.4");
    expect(url).toContain("lon=-3.7");
    expect(url).toContain("appid=test-api-key");
    expect(url).toContain("units=metric");

    expect(bundle.current.location.lat).toBeCloseTo(sampleResponse.lat);
    expect(bundle.current.location.lon).toBeCloseTo(sampleResponse.lon);
    expect(bundle.current.temperature).toBe(sampleResponse.current.temp);
    expect(bundle.current.feelsLike).toBe(sampleResponse.current.feels_like);
    expect(bundle.current.conditionLabel).toBe("few clouds");
    expect(bundle.current.conditionCode).toBe("cloudy");

    expect(Array.isArray(bundle.forecastTimelines)).toBe(true);
    expect(Array.isArray(bundle.alerts)).toBe(true);

    expect(bundle.provider.providerName).toBe("OpenWeatherMap");
    expect(bundle.provider.attributionText).toContain("OpenWeather");
  });

  it("throws config error when API key is missing", async () => {
    (globalThis as any).__TEST_OPENWEATHER_API_KEY__ = "";

    const service = new OpenWeatherService();
    const location: LocationRef = { lat: 40.4, lon: -3.7 };

    await expect(service.fetchWeatherBundle(location)).rejects.toMatchObject<
      WeatherError
    >({
      kind: "config",
    });
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
