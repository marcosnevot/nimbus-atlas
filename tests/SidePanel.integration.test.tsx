// tests/SidePanel.integration.test.tsx
import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { SidePanel } from "../src/app/layout/SidePanel";
import { useMapStore } from "../src/state/mapStore";
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
} from "../src/entities/weather/models";

const baseLocationRef: LocationRef = {
  lat: 40.4168,
  lon: -3.7038,
  name: "Madrid",
};

const fakeCurrentWeather: CurrentWeather = {
  location: baseLocationRef,
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

const fakeHourlyTimeline: ForecastTimeline = {
  location: baseLocationRef,
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
};

const fakeDailyTimeline: ForecastTimeline = {
  location: baseLocationRef,
  granularity: "daily",
  slices: [
    {
      timestamp: new Date(1700086400 * 1000).toISOString(),
      temperature: 20,
      conditionCode: "clear",
      conditionLabel: "Clear sky",
      precipitationProbability: 0.1,
      minTemperature: 15,
      maxTemperature: 22,
    },
  ],
};

const fakeAlerts: WeatherAlert[] = [
  {
    id: "alert-1",
    alertType: "wind",
    severity: "severe",
    title: "Orange wind warning",
    description: "Strong winds expected in the area.",
    startsAt: new Date(1700000000 * 1000).toISOString(),
    endsAt: new Date(1700007200 * 1000).toISOString(),
    locations: [baseLocationRef],
    source: "AEMET",
    tags: ["Wind", "Warning"],
  },
];

describe("SidePanel integration with weatherStore and mapStore", () => {
  beforeEach(() => {
    // Reset map store
    useMapStore.setState({
      viewport: null,
      isMapReady: false,
      selectedLocation: null,
      activeLayers: [],
      setViewport: useMapStore.getState().setViewport,
      setMapReady: useMapStore.getState().setMapReady,
      setSelectedLocation: useMapStore.getState().setSelectedLocation,
      clearSelectedLocation: useMapStore.getState().clearSelectedLocation,
      setActiveLayers: useMapStore.getState().setActiveLayers,
      toggleLayerVisibility: useMapStore.getState().toggleLayerVisibility,
    });

    // Reset weather store
    useWeatherStore.setState({
      currentByLocationKey: {},
      forecastByLocationKey: {},
      alertsByLocationKey: {},
      bundleTtlMs: useWeatherStore.getState().bundleTtlMs,
      ensureCurrentWeather: async () => {},
      ensureForecast: async () => {},
      ensureAlerts: async () => {},
      clearCurrentForLocation:
        useWeatherStore.getState().clearCurrentForLocation,
      clearForecastForLocation:
        useWeatherStore.getState().clearForecastForLocation,
      clearAlertsForLocation:
        useWeatherStore.getState().clearAlertsForLocation,
    });
  });

  it("renders current weather, forecast and alerts for the selected location", async () => {
    // 1) Simulate a selected location on the map (lat + lng)
    useMapStore.setState({
      selectedLocation: {
        lat: baseLocationRef.lat,
        lng: baseLocationRef.lon,
      },
    });

    // 2) Seed weather store with a successful bundle for that location
    const key = buildLocationKey(baseLocationRef);
    const now = Date.now();

    useWeatherStore.setState((state) => ({
      ...state,
      currentByLocationKey: {
        ...state.currentByLocationKey,
        [key]: {
          status: "success",
          data: fakeCurrentWeather,
          error: undefined,
          lastUpdatedAt: now,
          isRefreshing: false,
        },
      },
      forecastByLocationKey: {
        ...state.forecastByLocationKey,
        [key]: {
          status: "success",
          data: [fakeHourlyTimeline, fakeDailyTimeline],
          error: undefined,
          lastUpdatedAt: now,
          isRefreshing: false,
        },
      },
      alertsByLocationKey: {
        ...state.alertsByLocationKey,
        [key]: {
          status: "success",
          data: fakeAlerts,
          error: undefined,
          lastUpdatedAt: now,
          isRefreshing: false,
        },
      },
    }));

    render(<SidePanel />);

    // Coordinates
    expect(
      await screen.findByText(/Latitude: 40\.4168/)
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/Longitude: -3\.7038/)
    ).toBeInTheDocument();

    // Current weather
    expect(await screen.findByText("Current weather")).toBeInTheDocument();
    expect(await screen.findByText("Few clouds")).toBeInTheDocument();
    expect(await screen.findByText("Humidity: 65%")).toBeInTheDocument();

    // Forecast sections
    expect(await screen.findByText("Forecast")).toBeInTheDocument();
    expect(await screen.findByText("Next hours")).toBeInTheDocument();
    expect(await screen.findByText("Next days")).toBeInTheDocument();
    expect(
      await screen.findByText("Scattered clouds")
    ).toBeInTheDocument();
    expect(await screen.findByText("Clear sky")).toBeInTheDocument();

    // Alerts
    expect(await screen.findByText("Weather alerts")).toBeInTheDocument();
    expect(
      await screen.findByText("Orange wind warning")
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/SEVERE/i)
    ).toBeInTheDocument();
  });

  it("shows error message when current weather fails for the selected location", async () => {
    const error: WeatherError = {
      kind: "network",
      message: "Network down",
    };

    useMapStore.setState({
      selectedLocation: {
        lat: baseLocationRef.lat,
        lng: baseLocationRef.lon,
      },
    });

    const key = buildLocationKey(baseLocationRef);

    useWeatherStore.setState((state) => ({
      ...state,
      currentByLocationKey: {
        ...state.currentByLocationKey,
        [key]: {
          status: "error",
          data: undefined,
          error,
          lastUpdatedAt: Date.now(),
          isRefreshing: false,
        },
      },
      // Forecast/alerts left empty for this scenario
    }));

    render(<SidePanel />);

    // Error message for current weather should be visible
    expect(
      await screen.findByText(/Unable to load current weather/i)
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/Network down/i)
    ).toBeInTheDocument();
  });
});
