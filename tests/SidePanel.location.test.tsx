// tests/SidePanel.location.test.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SidePanel } from "../src/app/layout/SidePanel";
import { useMapStore } from "../src/state/mapStore";
import type {
  CurrentWeather,
  ForecastTimeline,
  LocationRef,
  WeatherError,
} from "../src/entities/weather/models";

// Mocks for the two hooks used by SidePanel
const currentHookMock = vi.fn();
const forecastHookMock = vi.fn();

vi.mock("../src/hooks/useSelectedLocationCurrentWeather", () => ({
  useSelectedLocationCurrentWeather: () => currentHookMock(),
}));

vi.mock("../src/hooks/useSelectedLocationForecast", () => ({
  useSelectedLocationForecast: () => forecastHookMock(),
}));

const baseLocation: LocationRef = {
  lat: 40.4168,
  lon: -3.7038,
  name: "Madrid",
  countryCode: "ES",
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

const fakeHourlyTimeline: ForecastTimeline = {
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
};

const fakeDailyTimeline: ForecastTimeline = {
  location: baseLocation,
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

describe("SidePanel (location & weather view)", () => {
  beforeEach(() => {
    // Reset map selection
    useMapStore.setState((state) => ({
      ...state,
      viewport: null,
      isMapReady: false,
      selectedLocation: null,
    }));

    currentHookMock.mockReset();
    forecastHookMock.mockReset();
  });

  it("renders selected location name, coordinates, and weather + forecast when resources succeed", async () => {
    // Simulate a selected location on the map (including name and country)
    useMapStore.setState((state) => ({
      ...state,
      selectedLocation: {
        lat: baseLocation.lat,
        lng: baseLocation.lon,
        name: baseLocation.name,
        countryCode: baseLocation.countryCode,
      } as any,
    }));

    currentHookMock.mockReturnValue({
      resource: {
        status: "success",
        data: fakeCurrentWeather,
        error: undefined,
      },
    });

    forecastHookMock.mockReturnValue({
      resource: {
        status: "success",
        data: [fakeHourlyTimeline, fakeDailyTimeline],
        error: undefined,
      },
    });

    render(<SidePanel isOpen={true} />);

    // Location header
    expect(await screen.findByText("Madrid, ES")).toBeInTheDocument();

    // Coordinates
    expect(
      await screen.findByText(/Latitude: 40\.4168/)
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/Longitude: -3\.7038/)
    ).toBeInTheDocument();

    // Current weather
    expect(await screen.findByText(/Current weather/i)).toBeInTheDocument();
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
  });

  it("renders an error message when current weather fails", async () => {
    useMapStore.setState((state) => ({
      ...state,
      selectedLocation: {
        lat: baseLocation.lat,
        lng: baseLocation.lon,
        name: baseLocation.name,
        countryCode: baseLocation.countryCode,
      } as any,
    }));

    const error: WeatherError = {
      kind: "network",
      message: "Network down",
    };

    currentHookMock.mockReturnValue({
      resource: {
        status: "error",
        data: undefined,
        error,
      },
    });

    // Forecast idle/empty is fine for this scenario
    forecastHookMock.mockReturnValue({
      resource: {
        status: "idle",
        data: [],
        error: undefined,
      },
    });

    render(<SidePanel isOpen={true} />);

    expect(
      await screen.findByText(/Unable to load current weather/i)
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/Network down/i)
    ).toBeInTheDocument();
  });

  it("renders a fallback message when forecast data is empty but current weather is available", async () => {
    useMapStore.setState((state) => ({
      ...state,
      selectedLocation: {
        lat: baseLocation.lat,
        lng: baseLocation.lon,
        name: baseLocation.name,
        countryCode: baseLocation.countryCode,
      } as any,
    }));

    currentHookMock.mockReturnValue({
      resource: {
        status: "success",
        data: fakeCurrentWeather,
        error: undefined,
      },
    });

    // Forecast succeeds but has no data (payload parcial)
    forecastHookMock.mockReturnValue({
      resource: {
        status: "success",
        data: [],
        error: undefined,
      },
    });

    render(<SidePanel isOpen={true} />);

    // Seguimos viendo el bloque de forecast
    expect(await screen.findByText("Forecast")).toBeInTheDocument();

    // Mensaje de “sin datos de forecast” coherente con el componente
    expect(
      await screen.findByText(/No forecast data available for this location\./i)
    ).toBeInTheDocument();
  });

  it("shows forecast error message while keeping current weather visible when forecast fails", async () => {
    useMapStore.setState((state) => ({
      ...state,
      selectedLocation: {
        lat: baseLocation.lat,
        lng: baseLocation.lon,
        name: baseLocation.name,
        countryCode: baseLocation.countryCode,
      } as any,
    }));

    currentHookMock.mockReturnValue({
      resource: {
        status: "success",
        data: fakeCurrentWeather,
        error: undefined,
      },
    });

    const forecastError: WeatherError = {
      kind: "network",
      message: "Forecast API down",
    };

    forecastHookMock.mockReturnValue({
      resource: {
        status: "error",
        data: [],
        error: forecastError,
      },
    });

    render(<SidePanel isOpen={true} />);

    // Current weather sigue visible
    expect(await screen.findByText("Few clouds")).toBeInTheDocument();

    // Mensaje de error específico de forecast
    expect(
      await screen.findByText(/Forecast is temporarily unavailable\./i)
    ).toBeInTheDocument();
  });
});
