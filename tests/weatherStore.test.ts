// tests/weatherStore.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  useWeatherStore,
  buildLocationKey,
} from "../src/state/weatherStore";
import type {
  CurrentWeather,
  ForecastTimeline,
  WeatherAlert,
  LocationRef,
  WeatherError,
  WeatherBundle,
} from "../src/entities/weather/models";

const fetchWeatherBundleMock = vi.hoisted(() => vi.fn());

vi.mock("../src/services/openWeatherService", () => {
  return {
    OpenWeatherService: class {
      fetchWeatherBundle = fetchWeatherBundleMock;
    },
  };
});

const baseLocation: LocationRef = {
  lat: 40.4168,
  lon: -3.7038,
  name: "Madrid",
};

const fakeCurrentWeather: CurrentWeather = {
  location: baseLocation,
  observedAt: new Date(1700000000 * 1000).toISOString(),
  temperature: 18.5,
  feelsLike: 18.0,
  conditionCode: "cloudy",
  conditionLabel: "Few clouds",
  humidity: 65,
  pressure: 1015,
  windSpeed: 3.5,
  windDirection: 250,
};

const fakeForecast: ForecastTimeline[] = [
  {
    location: baseLocation,
    granularity: "3h",
    slices: [
      {
        timestamp: new Date(1700003600 * 1000).toISOString(),
        temperature: 19,
        conditionCode: "cloudy",
        conditionLabel: "Scattered clouds",
        precipitationProbability: 0.2,
        windSpeed: 3.5,
        windDirection: 260,
      },
    ],
  },
];

const fakeAlerts: WeatherAlert[] = [
  {
    id: "alert-1",
    alertType: "wind",
    severity: "severe",
    title: "Orange wind warning",
    description: "Strong winds expected in the area.",
    startsAt: new Date(1700000000 * 1000).toISOString(),
    endsAt: new Date(1700007200 * 1000).toISOString(),
    locations: [baseLocation],
  },
];

const fakeBundle: WeatherBundle = {
  current: fakeCurrentWeather,
  forecastTimelines: fakeForecast,
  alerts: fakeAlerts,
  provider: {
    providerName: "OpenWeatherMap",
    attributionText: "Powered by OpenWeather",
    expectedUpdateIntervalMinutes: 10,
  },
};

describe("weatherStore ensure* methods", () => {
  beforeEach(() => {
    useWeatherStore.setState({
      currentByLocationKey: {},
      forecastByLocationKey: {},
      alertsByLocationKey: {},
      bundleTtlMs: 5 * 60 * 1000,
      ensureCurrentWeather: useWeatherStore.getState().ensureCurrentWeather,
      ensureForecast: useWeatherStore.getState().ensureForecast,
      ensureAlerts: useWeatherStore.getState().ensureAlerts,
      clearCurrentForLocation:
        useWeatherStore.getState().clearCurrentForLocation,
      clearForecastForLocation:
        useWeatherStore.getState().clearForecastForLocation,
      clearAlertsForLocation:
        useWeatherStore.getState().clearAlertsForLocation,
    });
    fetchWeatherBundleMock.mockReset();
  });

  it("stores bundle data on ensureCurrentWeather", async () => {
    fetchWeatherBundleMock.mockResolvedValue(fakeBundle);

    const location: LocationRef = { ...baseLocation };
    const key = buildLocationKey(location);

    await useWeatherStore.getState().ensureCurrentWeather(location);

    const state = useWeatherStore.getState();

    const currentRes = state.currentByLocationKey[key];
    const forecastRes = state.forecastByLocationKey[key];
    const alertsRes = state.alertsByLocationKey[key];

    expect(currentRes?.status).toBe("success");
    expect(currentRes?.data).toEqual(fakeCurrentWeather);

    expect(forecastRes?.status).toBe("success");
    expect(forecastRes?.data).toEqual(fakeForecast);

    expect(alertsRes?.status).toBe("success");
    expect(alertsRes?.data).toEqual(fakeAlerts);
  });

  it("deduplicates concurrent ensureCurrentWeather calls", async () => {
    fetchWeatherBundleMock.mockResolvedValue(fakeBundle);

    const location: LocationRef = { ...baseLocation };

    await Promise.all([
      useWeatherStore.getState().ensureCurrentWeather(location),
      useWeatherStore.getState().ensureCurrentWeather(location),
    ]);

    expect(fetchWeatherBundleMock).toHaveBeenCalledTimes(1);
  });

  it("propagates error to all resources when bundle fetch fails", async () => {
    const error: WeatherError = {
      kind: "network",
      message: "Network down",
    };

    fetchWeatherBundleMock.mockRejectedValue(error);

    const location: LocationRef = { ...baseLocation };
    const key = buildLocationKey(location);

    await useWeatherStore.getState().ensureCurrentWeather(location);

    const state = useWeatherStore.getState();
    const currentRes = state.currentByLocationKey[key];
    const forecastRes = state.forecastByLocationKey[key];
    const alertsRes = state.alertsByLocationKey[key];

    expect(currentRes?.status).toBe("error");
    expect(currentRes?.error).toEqual(error);

    expect(forecastRes?.status).toBe("error");
    expect(forecastRes?.error).toEqual(error);

    expect(alertsRes?.status).toBe("error");
    expect(alertsRes?.error).toEqual(error);
  });
});
