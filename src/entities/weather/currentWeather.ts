// src/entities/weather/currentWeather.ts

import type { Location } from '../location/location';

export type WeatherConditionCode =
  | 'clear'
  | 'cloudy'
  | 'rain'
  | 'snow'
  | 'storm'
  | 'drizzle'
  | 'fog'
  | 'unknown';

export interface ProviderMetadata {
  providerName: string;
  providerVersion?: string;
  fetchedAt: string; // ISO 8601 UTC
}

export type DataQualityFlag =
  | 'MISSING_REQUIRED'
  | 'MISSING_OPTIONAL'
  | 'OUT_OF_RANGE'
  | 'PARTIAL';

export interface DataQuality {
  flags: DataQualityFlag[];
  message?: string;
}

export interface CurrentWeather {
  location: Location;
  observedAt: string; // ISO 8601 UTC
  temperature: number; // °C
  feelsLike?: number; // °C
  conditionCode: WeatherConditionCode;
  conditionLabel: string;
  humidity?: number; // %
  pressure?: number; // hPa
  windSpeed?: number; // km/h
  windDirection?: number; // degrees
  cloudCoverage?: number; // %
  visibility?: number; // meters
  precipitationLastHour?: number; // mm
  providerMetadata?: ProviderMetadata;
  dataQuality?: DataQuality;
}

export type CurrentWeatherAdapterResult =
  | { kind: 'success'; data: CurrentWeather }
  | { kind: 'contract-error'; error: string }
  | { kind: 'unsupported'; error: string };
