// src/integrations/weather/openWeatherCurrentAdapter.ts

import type { OpenWeatherCurrentResponse } from './openWeatherTypes';
import type {
  CurrentWeather,
  CurrentWeatherAdapterResult,
  WeatherConditionCode,
} from '../../entities/weather/currentWeather';
import type { Location } from '../../entities/location/location';

const MIN_REASONABLE_TEMPERATURE_C = -90;
const MAX_REASONABLE_TEMPERATURE_C = 60;

function buildLocationFromResponse(
  payload: OpenWeatherCurrentResponse,
): Location {
  const lat = payload.lat;
  const lon = payload.lon;

  return {
    id: `owm:${lat.toFixed(4)},${lon.toFixed(4)}`,
    lat,
    lon,
    timezone: payload.timezone,
    source: 'provider',
  };
}

function toIsoUtcFromUnixSeconds(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toISOString();
}

function mpsToKmh(metersPerSecond: number): number {
  return metersPerSecond * 3.6;
}

function mapConditionCode(
  weatherEntry?: { id: number; main: string },
): WeatherConditionCode {
  if (!weatherEntry) {
    return 'unknown';
  }

  const { id, main } = weatherEntry;

  if (id >= 200 && id < 300) return 'storm';
  if (id >= 300 && id < 400) return 'drizzle';
  if (id >= 500 && id < 600) return 'rain';
  if (id >= 600 && id < 700) return 'snow';
  if (id >= 700 && id < 800) return 'fog';
  if (id === 800) return 'clear';
  if (id > 800 && id < 900) return 'cloudy';

  const normalizedMain = main.toLowerCase();
  if (normalizedMain.includes('rain')) return 'rain';
  if (normalizedMain.includes('snow')) return 'snow';
  if (normalizedMain.includes('storm') || normalizedMain.includes('thunder')) {
    return 'storm';
  }

  return 'unknown';
}

function capitalizeLabel(label: string): string {
  if (!label) return '';
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function mapOpenWeatherCurrentToDomain(
  payload: OpenWeatherCurrentResponse,
): CurrentWeatherAdapterResult {
  if (!payload || typeof payload !== 'object') {
    return {
      kind: 'contract-error',
      error: 'Invalid payload: expected non-null object',
    };
  }

  const { lat, lon, timezone, current } = payload;

  if (
    typeof lat !== 'number' ||
    Number.isNaN(lat) ||
    typeof lon !== 'number' ||
    Number.isNaN(lon)
  ) {
    return {
      kind: 'contract-error',
      error: 'Invalid payload: missing or invalid coordinates',
    };
  }

  if (!current || typeof current !== 'object') {
    return {
      kind: 'contract-error',
      error: 'Invalid payload: missing current block',
    };
  }

  const { dt, temp } = current;

  if (typeof dt !== 'number' || Number.isNaN(dt)) {
    return {
      kind: 'contract-error',
      error: 'Invalid payload: missing or invalid timestamp',
    };
  }

  if (typeof temp !== 'number' || Number.isNaN(temp)) {
    return {
      kind: 'contract-error',
      error: 'Invalid payload: missing or invalid temperature',
    };
  }

  if (temp < MIN_REASONABLE_TEMPERATURE_C || temp > MAX_REASONABLE_TEMPERATURE_C) {
    return {
      kind: 'contract-error',
      error: 'Invalid payload: temperature outside reasonable range',
    };
  }

  const location: Location = {
    id: `owm:${lat.toFixed(4)},${lon.toFixed(4)}`,
    lat,
    lon,
    timezone,
    source: 'provider',
  };

  const primaryWeather = Array.isArray(current.weather)
    ? current.weather[0]
    : undefined;

  const conditionCode = mapConditionCode(primaryWeather);
  const conditionLabel = primaryWeather
    ? capitalizeLabel(primaryWeather.description || primaryWeather.main)
    : 'Unknown';

  const windSpeed =
    typeof current.wind_speed === 'number'
      ? mpsToKmh(current.wind_speed)
      : undefined;

  const precipitationLastHour =
    current.rain?.['1h'] ?? current.snow?.['1h'] ?? undefined;

  const observedAt = toIsoUtcFromUnixSeconds(dt);
  const fetchedAt = new Date().toISOString();

  const currentWeather: CurrentWeather = {
    location,
    observedAt,
    temperature: temp,
    feelsLike: current.feels_like,
    conditionCode,
    conditionLabel,
    humidity: current.humidity,
    pressure: current.pressure,
    windSpeed,
    windDirection: current.wind_deg,
    cloudCoverage: current.clouds,
    visibility: current.visibility,
    precipitationLastHour,
    providerMetadata: {
      providerName: 'openweather',
      providerVersion: '3.0',
      fetchedAt,
    },
    // DataQuality can be enriched later if needed
    dataQuality: undefined,
  };

  return {
    kind: 'success',
    data: currentWeather,
  };
}
