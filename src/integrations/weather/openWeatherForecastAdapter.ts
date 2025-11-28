// src/integrations/weather/openWeatherForecastAdapter.ts

import type { Location } from '../../entities/location/location';
import type {
  ForecastTimeline,
  ForecastSlice,
  ForecastAdapterResult,
} from '../../entities/weather/forecast';
import type {
  WeatherConditionCode,
  ProviderMetadata,
} from '../../entities/weather/currentWeather';
import type { OpenWeatherForecastResponse } from './openWeatherForecastTypes';

function buildLocationFromResponse(payload: OpenWeatherForecastResponse): Location {
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

function buildProviderMetadata(): ProviderMetadata {
  return {
    providerName: 'openweather',
    providerVersion: '3.0',
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Downsamples hourly entries to roughly 3-hour steps by picking every third entry.
 */
function downsampleHourlyTo3h(
  hourly: OpenWeatherForecastResponse['hourly'],
): OpenWeatherForecastResponse['hourly'] {
  if (!hourly || hourly.length === 0) return [];
  return hourly.filter((_, index) => index % 3 === 0);
}

export function mapOpenWeatherForecastToTimelines(
  payload: OpenWeatherForecastResponse,
): ForecastAdapterResult {
  if (!payload || typeof payload !== 'object') {
    return {
      kind: 'contract-error',
      error: 'Invalid payload: expected non-null object',
    };
  }

  const { lat, lon, timezone, hourly, daily } = payload;

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

  if (!timezone || typeof timezone !== 'string') {
    return {
      kind: 'contract-error',
      error: 'Invalid payload: missing timezone',
    };
  }

  const location: Location = {
    id: `owm:${lat.toFixed(4)},${lon.toFixed(4)}`,
    lat,
    lon,
    timezone,
    source: 'provider',
  };

  const providerMetadata = buildProviderMetadata();
  const timelines: ForecastTimeline[] = [];

  // Hourly → granularity "3h"
  const downsampledHourly = downsampleHourlyTo3h(hourly);

  if (downsampledHourly && downsampledHourly.length > 0) {
    const hourlySlices: ForecastSlice[] = downsampledHourly
      .map((entry) => {
        if (typeof entry.dt !== 'number' || Number.isNaN(entry.dt)) {
          return undefined;
        }
        if (typeof entry.temp !== 'number' || Number.isNaN(entry.temp)) {
          return undefined;
        }

        const primaryWeather = Array.isArray(entry.weather)
          ? entry.weather[0]
          : undefined;

        const conditionCode = mapConditionCode(primaryWeather);
        const conditionLabel = primaryWeather
          ? capitalizeLabel(primaryWeather.description || primaryWeather.main)
          : 'Unknown';

        const precipitationProbabilityPct =
          typeof entry.pop === 'number'
            ? Math.min(Math.max(entry.pop * 100, 0), 100)
            : undefined;

        const slice: ForecastSlice = {
          time: toIsoUtcFromUnixSeconds(entry.dt),
          temperatureC: entry.temp,
          feelsLikeC: entry.feels_like,
          conditionCode,
          conditionLabel,
          precipitationProbabilityPct,
          windSpeedMs: entry.wind_speed,
          windDirectionDeg: entry.wind_deg,
        };

        return slice;
      })
      .filter((slice): slice is ForecastSlice => Boolean(slice));

    if (hourlySlices.length > 0) {
      timelines.push({
        location,
        granularity: '3h',
        slices: hourlySlices,
        providerMetadata,
      });
    }
  }

  // Daily → granularity "daily"
  if (daily && daily.length > 0) {
    const dailySlices: ForecastSlice[] = daily
      .map((entry) => {
        if (typeof entry.dt !== 'number' || Number.isNaN(entry.dt)) {
          return undefined;
        }
        if (!entry.temp || typeof entry.temp.day !== 'number') {
          return undefined;
        }

        const primaryWeather = Array.isArray(entry.weather)
          ? entry.weather[0]
          : undefined;

        const conditionCode = mapConditionCode(primaryWeather);
        const conditionLabel = primaryWeather
          ? capitalizeLabel(primaryWeather.description || primaryWeather.main)
          : 'Unknown';

        const precipitationProbabilityPct =
          typeof entry.pop === 'number'
            ? Math.min(Math.max(entry.pop * 100, 0), 100)
            : undefined;

        const slice: ForecastSlice = {
          time: toIsoUtcFromUnixSeconds(entry.dt),
          temperatureC: entry.temp.day,
          feelsLikeC: entry.feels_like?.day,
          conditionCode,
          conditionLabel,
          precipitationProbabilityPct,
          windSpeedMs: entry.wind_speed,
          windDirectionDeg: entry.wind_deg,
          minTemperatureC: entry.temp.min,
          maxTemperatureC: entry.temp.max,
        };

        return slice;
      })
      .filter((slice): slice is ForecastSlice => Boolean(slice));

    if (dailySlices.length > 0) {
      timelines.push({
        location,
        granularity: 'daily',
        slices: dailySlices,
        providerMetadata,
      });
    }
  }

  if (timelines.length === 0) {
    return {
      kind: 'contract-error',
      error: 'Invalid payload: no usable hourly or daily forecast data',
    };
  }

  return {
    kind: 'success',
    data: timelines,
  };
}
