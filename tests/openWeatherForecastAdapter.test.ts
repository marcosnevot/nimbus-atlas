// tests/openWeatherForecastAdapter.test.ts

import { describe, it, expect } from 'vitest';
import { mapOpenWeatherForecastToTimelines } from '../src/integrations/weather/openWeatherForecastAdapter';
import {
  openWeatherForecastSuccessFixture,
  openWeatherForecastNoDataFixture,
} from './fixtures/openWeatherForecastFixture';

describe('mapOpenWeatherForecastToTimelines', () => {
  it('maps a valid OpenWeather forecast payload to two timelines', () => {
    const result = mapOpenWeatherForecastToTimelines(
      openWeatherForecastSuccessFixture,
    );

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') return;

    const timelines = result.data;
    const hourlyTimeline = timelines.find((t) => t.granularity === '3h');
    const dailyTimeline = timelines.find((t) => t.granularity === 'daily');

    expect(hourlyTimeline).toBeDefined();
    expect(dailyTimeline).toBeDefined();

    if (!hourlyTimeline || !dailyTimeline) return;

    expect(hourlyTimeline.location.lat).toBeCloseTo(
      openWeatherForecastSuccessFixture.lat,
    );
    expect(hourlyTimeline.location.lon).toBeCloseTo(
      openWeatherForecastSuccessFixture.lon,
    );

    expect(hourlyTimeline.slices.length).toBeGreaterThan(0);
    expect(dailyTimeline.slices.length).toBeGreaterThan(0);

    const firstHourly = hourlyTimeline.slices[0];
    expect(firstHourly.temperatureC).toBe(
      openWeatherForecastSuccessFixture.hourly![0].temp,
    );
    expect(firstHourly.conditionLabel).toBe('Few clouds');
    expect(firstHourly.precipitationProbabilityPct).toBeCloseTo(10);

    const firstDaily = dailyTimeline.slices[0];
    expect(firstDaily.temperatureC).toBe(
      openWeatherForecastSuccessFixture.daily![0].temp.day,
    );
    expect(firstDaily.minTemperatureC).toBe(
      openWeatherForecastSuccessFixture.daily![0].temp.min,
    );
    expect(firstDaily.maxTemperatureC).toBe(
      openWeatherForecastSuccessFixture.daily![0].temp.max,
    );
    expect(firstDaily.precipitationProbabilityPct).toBeCloseTo(25);
  });

  it('returns contract-error when there is no usable hourly or daily data', () => {
    const result = mapOpenWeatherForecastToTimelines(
      openWeatherForecastNoDataFixture,
    );

    expect(result.kind).toBe('contract-error');
    if (result.kind === 'contract-error') {
      expect(result.error).toContain('no usable hourly or daily forecast data');
    }
  });

  it('returns contract-error for invalid payload type', () => {
    const result = mapOpenWeatherForecastToTimelines(null as any);
    expect(result.kind).toBe('contract-error');
  });
});
