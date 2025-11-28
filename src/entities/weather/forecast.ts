// src/entities/weather/forecast.ts

import type { Location } from '../location/location';
import type {
  WeatherConditionCode,
  ProviderMetadata,
  DataQuality,
} from './currentWeather';

export type ForecastGranularity = '3h' | 'daily';

export interface ForecastSlice {
  time: string; // ISO 8601 UTC
  temperatureC: number;
  feelsLikeC?: number;
  conditionCode: WeatherConditionCode;
  conditionLabel: string;
  precipitationProbabilityPct?: number; // 0..100
  windSpeedMs?: number;
  windDirectionDeg?: number;
  minTemperatureC?: number; // mainly for daily slices
  maxTemperatureC?: number; // mainly for daily slices
}

export interface ForecastTimeline {
  location: Location;
  granularity: ForecastGranularity;
  slices: ForecastSlice[];
  providerMetadata?: ProviderMetadata;
  dataQuality?: DataQuality;
}

export type ForecastAdapterResult =
  | { kind: 'success'; data: ForecastTimeline[] }
  | { kind: 'contract-error'; error: string };
