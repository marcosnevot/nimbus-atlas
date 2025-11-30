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
    // Reset only the resource maps and TTL, keep actions as implemented
    useWeatherStore.setState((state) => ({
      ...state,
      currentByLocationKey: {},
      forecastByLocationKey: {},
      alertsByLocationKey: {},
      bundleTtlMs: 5 * 60 * 1000,
    }));
    fetchWeatherBundleMock.mockReset();
  });

  it("buildLocationKey rounds coordinates and appends id when provided", () => {
    const location: LocationRef = {
      lat: 40.416789,
      lon: -3.703845,
      name: "Madrid",
      id: "loc-1",
    };

    const key = buildLocationKey(location);

    expect(key).toBe("loc:40.417,-3.704:loc-1");
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

  it("deduplicates concurrent ensure* calls for the same location", async () => {
    fetchWeatherBundleMock.mockResolvedValue(fakeBundle);

    const location: LocationRef = { ...baseLocation };

    await Promise.all([
      useWeatherStore.getState().ensureCurrentWeather(location),
      useWeatherStore.getState().ensureForecast(location),
      useWeatherStore.getState().ensureAlerts(location),
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

  it("does not fetch when existing current resource is fresh and successful", async () => {
    const location: LocationRef = { ...baseLocation };
    const key = buildLocationKey(location);
    const now = Date.now();

    useWeatherStore.setState((state) => ({
      ...state,
      currentByLocationKey: {
        [key]: {
          status: "success",
          data: fakeCurrentWeather,
          lastUpdatedAt: now,
        },
      },
    }));

    await useWeatherStore.getState().ensureCurrentWeather(location);

    expect(fetchWeatherBundleMock).not.toHaveBeenCalled();
  });

  it("marks resources as refreshing when data exists and TTL is expired", async () => {
    const location: LocationRef = { ...baseLocation };
    const key = buildLocationKey(location);

    useWeatherStore.setState((state) => ({
      ...state,
      bundleTtlMs: 0, // force refresh
      currentByLocationKey: {
        [key]: {
          status: "success",
          data: fakeCurrentWeather,
          lastUpdatedAt: Date.now() - 10 * 60 * 1000,
        },
      },
      forecastByLocationKey: {},
      alertsByLocationKey: {},
    }));

    let resolveBundle: (bundle: WeatherBundle) => void;
    const bundlePromise = new Promise<WeatherBundle>((resolve) => {
      resolveBundle = resolve;
    });

    fetchWeatherBundleMock.mockReturnValue(bundlePromise);

    const ensurePromise =
      useWeatherStore.getState().ensureCurrentWeather(location);

    const intermediateState = useWeatherStore.getState();
    expect(intermediateState.currentByLocationKey[key]).toMatchObject({
      status: "success",
      isRefreshing: true,
      data: fakeCurrentWeather,
    });

    resolveBundle!(fakeBundle);
    await ensurePromise;

    const finalState = useWeatherStore.getState();
    expect(finalState.currentByLocationKey[key]).toMatchObject({
      status: "success",
      isRefreshing: false,
      data: fakeCurrentWeather,
    });
  });

  it("preserves previous data when fetch fails and sets error status", async () => {
    const location: LocationRef = { ...baseLocation };
    const key = buildLocationKey(location);

    const previousCurrent: CurrentWeather = {
      ...fakeCurrentWeather,
      temperature: 10,
    };

    useWeatherStore.setState((state) => ({
      ...state,
      currentByLocationKey: {
        [key]: {
          status: "success",
          data: previousCurrent,
          lastUpdatedAt: Date.now() - 10 * 60 * 1000,
        },
      },
      forecastByLocationKey: {
        [key]: {
          status: "success",
          data: fakeForecast,
          lastUpdatedAt: Date.now() - 10 * 60 * 1000,
        },
      },
      alertsByLocationKey: {
        [key]: {
          status: "success",
          data: fakeAlerts,
          lastUpdatedAt: Date.now() - 10 * 60 * 1000,
        },
      },
      bundleTtlMs: 0,
    }));

    const error: WeatherError = {
      kind: "network",
      message: "Network down",
    };

    fetchWeatherBundleMock.mockRejectedValue(error);

    await useWeatherStore.getState().ensureCurrentWeather(location);

    const state = useWeatherStore.getState();

    expect(state.currentByLocationKey[key]).toMatchObject({
      status: "error",
      data: previousCurrent,
      error,
      isRefreshing: false,
    });

    expect(state.forecastByLocationKey[key]).toMatchObject({
      status: "error",
      data: fakeForecast,
      error,
      isRefreshing: false,
    });

    expect(state.alertsByLocationKey[key]).toMatchObject({
      status: "error",
      data: fakeAlerts,
      error,
      isRefreshing: false,
    });
  });

  it("clears resources by location key", () => {
    const location: LocationRef = { ...baseLocation };
    const key = buildLocationKey(location);

    useWeatherStore.setState((state) => ({
      ...state,
      currentByLocationKey: { [key]: { status: "success" } as any },
      forecastByLocationKey: { [key]: { status: "success" } as any },
      alertsByLocationKey: { [key]: { status: "success" } as any },
    }));

    const store = useWeatherStore.getState();
    store.clearCurrentForLocation(key);
    store.clearForecastForLocation(key);
    store.clearAlertsForLocation(key);

    const state = useWeatherStore.getState();
    expect(state.currentByLocationKey[key]).toBeUndefined();
    expect(state.forecastByLocationKey[key]).toBeUndefined();
    expect(state.alertsByLocationKey[key]).toBeUndefined();
  });
});
