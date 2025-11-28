// tests/openWeatherCurrentAdapter.test.ts

import { describe, it, expect } from 'vitest';
import { mapOpenWeatherCurrentToDomain } from '../src/integrations/weather/openWeatherCurrentAdapter';
import {
  openWeatherCurrentSuccessFixture,
  openWeatherCurrentMissingTempFixture,
  openWeatherCurrentOutOfRangeTempFixture,
} from './fixtures/openWeatherCurrentFixture';

describe('mapOpenWeatherCurrentToDomain', () => {
  it('maps a valid OpenWeather current payload to domain CurrentWeather', () => {
    const result = mapOpenWeatherCurrentToDomain(openWeatherCurrentSuccessFixture);

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      return;
    }

    const data = result.data;

    expect(data.location.lat).toBeCloseTo(40.4168);
    expect(data.location.lon).toBeCloseTo(-3.7038);
    expect(data.location.id).toContain('owm:');

    expect(data.temperature).toBe(18.5);
    expect(data.feelsLike).toBe(18.0);

    expect(data.conditionCode).toBe('cloudy');
    expect(data.conditionLabel).toBe('Few clouds');

    expect(data.humidity).toBe(65);
    expect(data.pressure).toBe(1015);

    // wind_speed 3.5 m/s -> 12.6 km/h
    expect(data.windSpeed).toBeCloseTo(12.6, 1);

    expect(data.cloudCoverage).toBe(40);
    expect(data.visibility).toBe(10000);
    expect(data.precipitationLastHour).toBe(0.3);

    expect(data.providerMetadata?.providerName).toBe('openweather');
    expect(data.providerMetadata?.providerVersion).toBe('3.0');
  });

  it('returns contract-error when temperature is missing', () => {
    const result = mapOpenWeatherCurrentToDomain(
      openWeatherCurrentMissingTempFixture,
    );

    expect(result.kind).toBe('contract-error');
    if (result.kind === 'contract-error') {
      expect(result.error).toContain('temperature');
    }
  });

  it('returns contract-error when temperature is outside reasonable range', () => {
    const result = mapOpenWeatherCurrentToDomain(
      openWeatherCurrentOutOfRangeTempFixture,
    );

    expect(result.kind).toBe('contract-error');
    if (result.kind === 'contract-error') {
      expect(result.error).toContain('temperature outside reasonable range');
    }
  });

  it('returns contract-error for invalid payload type', () => {
    const result = mapOpenWeatherCurrentToDomain(null as any);
    expect(result.kind).toBe('contract-error');
  });
});
