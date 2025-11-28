// tests/openWeatherAlertsAdapter.test.ts

import { describe, it, expect } from 'vitest';
import { mapOpenWeatherAlertsToDomain } from '../src/integrations/weather/openWeatherAlertsAdapter';
import {
  openWeatherAlertsSuccessFixture,
  openWeatherAlertsPartialFixture,
  openWeatherAlertsEmptyFixture,
} from './fixtures/openWeatherAlertsFixture';

describe('mapOpenWeatherAlertsToDomain', () => {
  it('maps valid OpenWeather alerts to domain WeatherAlert[]', () => {
    const result = mapOpenWeatherAlertsToDomain(openWeatherAlertsSuccessFixture);

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') return;

    const alerts = result.data;
    expect(alerts.length).toBe(2);

    const first = alerts[0];
    expect(first.location.lat).toBeCloseTo(openWeatherAlertsSuccessFixture.lat);
    expect(first.location.lon).toBeCloseTo(openWeatherAlertsSuccessFixture.lon);
    expect(first.title).toBe('Orange wind warning');
    expect(first.severity).toBe('severe');
    expect(first.category).toBe('wind');
    expect(first.startsAt).toBeDefined();
    expect(first.endsAt).toBeDefined();
    expect(first.source).toBe('AEMET');
    expect(first.providerMetadata?.providerName).toBe('openweather');
  });

  it('returns success with empty list when no alerts are present', () => {
    const result = mapOpenWeatherAlertsToDomain(openWeatherAlertsEmptyFixture);

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') return;

    expect(result.data).toHaveLength(0);
  });

  it('builds DataQuality flags for partial alerts', () => {
    const result = mapOpenWeatherAlertsToDomain(openWeatherAlertsPartialFixture);

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') return;

    expect(result.data.length).toBe(1);
    const alert = result.data[0];

    expect(alert.title).toBe('Weather alert'); // default title
    expect(alert.dataQuality).toBeDefined();
    if (!alert.dataQuality) return;

    expect(alert.dataQuality.flags.length).toBeGreaterThan(0);
  });

  it('returns contract-error for invalid envelope type', () => {
    const result = mapOpenWeatherAlertsToDomain(null as any);
    expect(result.kind).toBe('contract-error');
  });
});
