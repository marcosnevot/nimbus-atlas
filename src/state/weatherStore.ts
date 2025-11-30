// src/state/weatherStore.ts

import { create } from "zustand";
import type {
  CurrentWeather,
  ForecastTimeline,
  WeatherAlert,
  LocationRef,
  WeatherError,
  WeatherBundle,
} from "../entities/weather/models";
import { OpenWeatherService } from "../services/openWeatherService";

export type WeatherResourceStatus = "idle" | "loading" | "success" | "error";

export interface WeatherResource<T> {
  status: WeatherResourceStatus;
  data?: T;
  error?: WeatherError;
  lastUpdatedAt?: number;
  isRefreshing?: boolean;
}

export interface WeatherState {
  currentByLocationKey: Record<string, WeatherResource<CurrentWeather>>;
  forecastByLocationKey: Record<string, WeatherResource<ForecastTimeline[]>>;
  alertsByLocationKey: Record<string, WeatherResource<WeatherAlert[]>>;
  bundleTtlMs: number;

  ensureCurrentWeather: (location: LocationRef) => Promise<void>;
  ensureForecast: (location: LocationRef) => Promise<void>;
  ensureAlerts: (location: LocationRef) => Promise<void>;

  clearCurrentForLocation: (locationKey: string) => void;
  clearForecastForLocation: (locationKey: string) => void;
  clearAlertsForLocation: (locationKey: string) => void;
}

const DEFAULT_BUNDLE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const weatherService = new OpenWeatherService();

const inFlightWeatherRequests = new Map<string, Promise<void>>();

export function buildLocationKey(location: LocationRef): string {
  const lat = location.lat.toFixed(3);
  const lon = location.lon.toFixed(3);
  const idPart = location.id ? `:${location.id}` : "";
  return `loc:${lat},${lon}${idPart}`;
}

export const useWeatherStore = create<WeatherState>((set, get) => {
  const ensureBundleInternal = async (location: LocationRef): Promise<void> => {
    const key = buildLocationKey(location);
    const { currentByLocationKey, bundleTtlMs } = get();

    const now = Date.now();
    const existingCurrent = currentByLocationKey[key];
    const isFresh =
      existingCurrent?.status === "success" &&
      typeof existingCurrent.lastUpdatedAt === "number" &&
      now - existingCurrent.lastUpdatedAt < bundleTtlMs;

    if (isFresh) {
      return;
    }

    const existingPromise = inFlightWeatherRequests.get(key);
    if (existingPromise) {
      return existingPromise;
    }

    const promise = (async () => {
      set((state) => {
        const prevCurrent = state.currentByLocationKey[key];
        const prevForecast = state.forecastByLocationKey[key];
        const prevAlerts = state.alertsByLocationKey[key];

        const isRefreshing =
          !!prevCurrent?.data || !!prevForecast?.data || !!prevAlerts?.data;

        return {
          currentByLocationKey: {
            ...state.currentByLocationKey,
            [key]: {
              status: isRefreshing ? "success" : "loading",
              data: prevCurrent?.data,
              error: undefined,
              lastUpdatedAt: prevCurrent?.lastUpdatedAt,
              isRefreshing,
            },
          },
          forecastByLocationKey: {
            ...state.forecastByLocationKey,
            [key]: {
              status: isRefreshing ? "success" : "loading",
              data: prevForecast?.data,
              error: undefined,
              lastUpdatedAt: prevForecast?.lastUpdatedAt,
              isRefreshing,
            },
          },
          alertsByLocationKey: {
            ...state.alertsByLocationKey,
            [key]: {
              status: isRefreshing ? "success" : "loading",
              data: prevAlerts?.data,
              error: undefined,
              lastUpdatedAt: prevAlerts?.lastUpdatedAt,
              isRefreshing,
            },
          },
        };
      });

      try {
        const bundle: WeatherBundle = await weatherService.fetchWeatherBundle(
          location
        );
        const ts = Date.now();

        set((state) => ({
          currentByLocationKey: {
            ...state.currentByLocationKey,
            [key]: {
              status: "success",
              data: bundle.current,
              error: undefined,
              lastUpdatedAt: ts,
              isRefreshing: false,
            },
          },
          forecastByLocationKey: {
            ...state.forecastByLocationKey,
            [key]: {
              status: "success",
              data: bundle.forecastTimelines,
              error: undefined,
              lastUpdatedAt: ts,
              isRefreshing: false,
            },
          },
          alertsByLocationKey: {
            ...state.alertsByLocationKey,
            [key]: {
              status: "success",
              data: bundle.alerts,
              error: undefined,
              lastUpdatedAt: ts,
              isRefreshing: false,
            },
          },
        }));
      } catch (e) {
        const error = e as WeatherError;

        set((state) => ({
          currentByLocationKey: {
            ...state.currentByLocationKey,
            [key]: {
              status: "error",
              data: state.currentByLocationKey[key]?.data,
              error,
              lastUpdatedAt: Date.now(),
              isRefreshing: false,
            },
          },
          forecastByLocationKey: {
            ...state.forecastByLocationKey,
            [key]: {
              status: "error",
              data: state.forecastByLocationKey[key]?.data,
              error,
              lastUpdatedAt: Date.now(),
              isRefreshing: false,
            },
          },
          alertsByLocationKey: {
            ...state.alertsByLocationKey,
            [key]: {
              status: "error",
              data: state.alertsByLocationKey[key]?.data,
              error,
              lastUpdatedAt: Date.now(),
              isRefreshing: false,
            },
          },
        }));
      } finally {
        inFlightWeatherRequests.delete(key);
      }
    })();

    inFlightWeatherRequests.set(key, promise);
    return promise;
  };

  return {
    currentByLocationKey: {},
    forecastByLocationKey: {},
    alertsByLocationKey: {},
    bundleTtlMs: DEFAULT_BUNDLE_TTL_MS,

    ensureCurrentWeather: ensureBundleInternal,
    ensureForecast: ensureBundleInternal,
    ensureAlerts: ensureBundleInternal,

    clearCurrentForLocation(locationKey: string) {
      set((state) => {
        const next = { ...state.currentByLocationKey };
        delete next[locationKey];
        return { currentByLocationKey: next };
      });
    },

    clearForecastForLocation(locationKey: string) {
      set((state) => {
        const next = { ...state.forecastByLocationKey };
        delete next[locationKey];
        return { forecastByLocationKey: next };
      });
    },

    clearAlertsForLocation(locationKey: string) {
      set((state) => {
        const next = { ...state.alertsByLocationKey };
        delete next[locationKey];
        return { alertsByLocationKey: next };
      });
    },
  };
});
