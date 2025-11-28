// src/integrations/weather/openWeatherAlertsAdapter.ts

import type { Location } from '../../entities/location/location';
import type {
  WeatherAlert,
  WeatherAlertSeverity,
  WeatherAlertsAdapterResult,
} from '../../entities/weather/weatherAlert';
import type {
  ProviderMetadata,
  DataQuality,
  DataQualityFlag,
} from '../../entities/weather/currentWeather';
import type {
  OpenWeatherAlertsEnvelope,
  OpenWeatherAlertEntry,
} from './openWeatherAlertsTypes';

function buildLocationFromEnvelope(
  envelope: OpenWeatherAlertsEnvelope,
): Location {
  const lat = envelope.lat;
  const lon = envelope.lon;

  return {
    id: `owm:${lat.toFixed(4)},${lon.toFixed(4)}`,
    lat,
    lon,
    timezone: envelope.timezone,
    source: 'provider',
  };
}

function toIsoUtcFromUnixSeconds(unixSeconds?: number): string | undefined {
  if (typeof unixSeconds !== 'number' || Number.isNaN(unixSeconds)) {
    return undefined;
  }
  return new Date(unixSeconds * 1000).toISOString();
}

function normalizeString(value?: string): string {
  return (value ?? '').trim();
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function buildAlertId(
  envelope: OpenWeatherAlertsEnvelope,
  entry: OpenWeatherAlertEntry,
  index: number,
): string {
  const baseTitle = normalizeString(entry.event || 'weather-alert');
  const titleSlug = slugify(baseTitle || `alert-${index}`);
  const startPart =
    typeof entry.start === 'number' && !Number.isNaN(entry.start)
      ? entry.start.toString()
      : `idx-${index}`;

  const latPart = Math.round(envelope.lat * 1000);
  const lonPart = Math.round(envelope.lon * 1000);

  return `owm-alert:${latPart}:${lonPart}:${startPart}:${titleSlug}`;
}

function mapSeverity(entry: OpenWeatherAlertEntry): WeatherAlertSeverity {
  const tags = (entry.tags ?? []).map((t) => t.toLowerCase());
  const title = (entry.event ?? '').toLowerCase();
  const description = (entry.description ?? '').toLowerCase();

  if (
    tags.includes('extreme') ||
    title.includes('red') ||
    description.includes('red warning')
  ) {
    return 'extreme';
  }

  if (
    tags.includes('severe') ||
    title.includes('warning') ||
    description.includes('warning')
  ) {
    return 'severe';
  }

  if (tags.includes('moderate') || title.includes('watch')) {
    return 'moderate';
  }

  if (tags.includes('minor') || tags.includes('advisory')) {
    return 'minor';
  }

  return 'unknown';
}

function inferCategory(entry: OpenWeatherAlertEntry): string | undefined {
  const title = (entry.event ?? '').toLowerCase();
  const description = (entry.description ?? '').toLowerCase();
  const tags = (entry.tags ?? []).map((t) => t.toLowerCase());

  const haystack = `${title} ${description} ${tags.join(' ')}`;

  if (haystack.includes('wind')) return 'wind';
  if (haystack.includes('storm') || haystack.includes('thunder')) return 'storm';
  if (haystack.includes('rain') || haystack.includes('flood')) return 'rain';
  if (haystack.includes('snow') || haystack.includes('ice')) return 'snow';
  if (haystack.includes('heat')) return 'heat';
  if (haystack.includes('cold') || haystack.includes('frost')) return 'cold';
  if (haystack.includes('fog')) return 'fog';

  return undefined;
}

function buildProviderMetadata(): ProviderMetadata {
  return {
    providerName: 'openweather',
    providerVersion: '3.0',
    fetchedAt: new Date().toISOString(),
  };
}

function buildDataQuality(entry: OpenWeatherAlertEntry): DataQuality | undefined {
  const flags: DataQualityFlag[] = [];

  if (!entry.event || !entry.event.trim()) {
    flags.push('MISSING_REQUIRED');
  }

  if (!entry.description || !entry.description.trim()) {
    flags.push('MISSING_OPTIONAL');
  }

  if (!entry.start || !entry.end) {
    flags.push('PARTIAL');
  }

  if (flags.length === 0) {
    return undefined;
  }

  return {
    flags,
    message: 'Alert has missing or partial fields from provider payload',
  };
}

export function mapOpenWeatherAlertsToDomain(
  envelope: OpenWeatherAlertsEnvelope,
): WeatherAlertsAdapterResult {
  if (!envelope || typeof envelope !== 'object') {
    return {
      kind: 'contract-error',
      error: 'Invalid payload: expected non-null object',
    };
  }

  const { lat, lon, timezone, alerts } = envelope;

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

  if (!alerts || alerts.length === 0) {
    return {
      kind: 'success',
      data: [],
    };
  }

  const location = buildLocationFromEnvelope(envelope);
  const providerMetadata = buildProviderMetadata();

  const mappedAlerts: WeatherAlert[] = alerts.map((entry, index) => {
    const title =
      normalizeString(entry.event) || 'Weather alert';

    const severity = mapSeverity(entry);
    const category = inferCategory(entry);
    const startsAt = toIsoUtcFromUnixSeconds(entry.start);
    const endsAt = toIsoUtcFromUnixSeconds(entry.end);
    const dataQuality = buildDataQuality(entry);

    const alert: WeatherAlert = {
      id: buildAlertId(envelope, entry, index),
      location,
      title,
      description: normalizeString(entry.description),
      severity,
      startsAt,
      endsAt,
      source: normalizeString(entry.sender_name),
      category,
      tags: entry.tags,
      providerMetadata,
      dataQuality,
    };

    return alert;
  });

  return {
    kind: 'success',
    data: mappedAlerts,
  };
}
