// src/entities/weather/models.ts

export interface LocationRef {
  id?: string;
  name?: string;
  countryCode?: string;
  timezone?: string;
  lat: number;
  lon: number;
}

export type WeatherConditionCode =
  | "clear"
  | "partly_cloudy"
  | "cloudy"
  | "rain"
  | "snow"
  | "storm"
  | "drizzle"
  | "mist"
  | "fog"
  | "thunderstorm"
  | "other";

export interface CurrentWeather {
  location: LocationRef;
  observedAt: string; // ISO string in UTC
  temperature: number; // Celsius
  feelsLike?: number;
  conditionCode: WeatherConditionCode;
  conditionLabel: string;
  humidity?: number;
  pressure?: number;
  windSpeed?: number; // m/s
  windDirection?: number; // degrees
}

export type ForecastGranularity = "3h" | "daily";

export interface ForecastSlice {
  timestamp: string; // ISO string in UTC
  temperature: number;
  conditionCode: WeatherConditionCode;
  conditionLabel: string;
  precipitationProbability?: number; // 0..1
  windSpeed?: number;
  windDirection?: number;
  minTemperature?: number; // mainly daily
  maxTemperature?: number; // mainly daily
}

export interface ForecastTimeline {
  location: LocationRef;
  granularity: ForecastGranularity;
  slices: ForecastSlice[];
}

export type WeatherAlertSeverity =
  | "minor"
  | "moderate"
  | "severe"
  | "extreme"
  | "unknown";

export type WeatherAlertType =
  | "storm"
  | "heatwave"
  | "coldwave"
  | "flood"
  | "wind"
  | "rain"
  | "snow"
  | "fog"
  | "other";

export interface WeatherAlert {
  id: string;
  alertType: WeatherAlertType;
  severity: WeatherAlertSeverity;
  title: string;
  description: string;
  startsAt?: string; // ISO
  endsAt?: string; // ISO
  locations?: LocationRef[];
  source?: string;
  tags?: string[];
}

export interface ProviderMetadata {
  providerName: string;
  attributionText?: string;
  expectedUpdateIntervalMinutes?: number;
}

export type WeatherErrorKind =
  | "network"
  | "http"
  | "contract"
  | "rate_limit"
  | "config"
  | "unknown";

export interface WeatherError {
  kind: WeatherErrorKind;
  message: string;
  statusCode?: number;
  retryAfterMs?: number;
}

export interface WeatherBundle {
  current: CurrentWeather;
  forecastTimelines: ForecastTimeline[];
  alerts: WeatherAlert[];
  provider: ProviderMetadata;
}

// City weather overlay view models (Phase 5)

export interface CityWeatherPoint {
  id: string;
  location: LocationRef;
  temperature: number;
  conditionCode: WeatherConditionCode;
  conditionLabel: string;
  observedAt: string; // ISO string in UTC
  population?: number;
}