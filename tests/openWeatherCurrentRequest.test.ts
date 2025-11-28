// tests/openWeatherCurrentRequest.test.ts

import { describe, it, expect } from 'vitest';
import { buildOpenWeatherCurrentUrl } from '../src/integrations/weather/openWeatherClient';

describe('buildOpenWeatherCurrentUrl', () => {
  it('builds a valid URL with required parameters', () => {
    const url = buildOpenWeatherCurrentUrl({
      lat: 40.4168,
      lon: -3.7038,
      apiKey: 'test-api-key',
    });

    expect(url).toContain('https://api.openweathermap.org/data/3.0/onecall');
    expect(url).toContain('lat=40.4168');
    expect(url).toContain('lon=-3.7038');
    expect(url).toContain('appid=test-api-key');
    expect(url).toContain('units=metric');
    expect(url).toContain(
      'exclude=minutely%2Chourly%2Cdaily%2Calerts',
    );
  });

  it('includes custom lang and units when provided', () => {
    const url = buildOpenWeatherCurrentUrl({
      lat: 51.5074,
      lon: -0.1278,
      apiKey: 'test-api-key',
      units: 'imperial',
      lang: 'es',
    });

    expect(url).toContain('units=imperial');
    expect(url).toContain('lang=es');
  });
});
