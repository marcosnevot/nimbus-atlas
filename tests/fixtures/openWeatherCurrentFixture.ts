// tests/fixtures/openWeatherCurrentFixture.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { OpenWeatherCurrentResponse } from '../../src/integrations/weather/openWeatherTypes';

export const openWeatherCurrentSuccessFixture: OpenWeatherCurrentResponse = {
  lat: 40.4168,
  lon: -3.7038,
  timezone: 'Europe/Madrid',
  timezone_offset: 3600,
  current: {
    dt: 1700000000,
    temp: 18.5,
    feels_like: 18.0,
    pressure: 1015,
    humidity: 65,
    wind_speed: 3.5,
    wind_deg: 250,
    clouds: 40,
    visibility: 10000,
    rain: {
      '1h': 0.3,
    },
    weather: [
      {
        id: 801,
        main: 'Clouds',
        description: 'few clouds',
        icon: '02d',
      },
    ],
  },
};

export const openWeatherCurrentMissingTempFixture: any = {
  lat: 40.4168,
  lon: -3.7038,
  timezone: 'Europe/Madrid',
  timezone_offset: 3600,
  current: {
    dt: 1700000000,
    // temp is intentionally missing
    pressure: 1015,
    humidity: 65,
    wind_speed: 3.5,
    wind_deg: 250,
    clouds: 40,
    visibility: 10000,
    weather: [
      {
        id: 800,
        main: 'Clear',
        description: 'clear sky',
        icon: '01d',
      },
    ],
  },
};

export const openWeatherCurrentOutOfRangeTempFixture: OpenWeatherCurrentResponse =
  {
    lat: 40.4168,
    lon: -3.7038,
    timezone: 'Europe/Madrid',
    timezone_offset: 3600,
    current: {
      dt: 1700000000,
      temp: 120, // unrealistic temperature
      feels_like: 120,
      pressure: 1015,
      humidity: 65,
      wind_speed: 3.5,
      wind_deg: 250,
      clouds: 40,
      visibility: 10000,
      weather: [
        {
          id: 800,
          main: 'Clear',
          description: 'clear sky',
          icon: '01d',
        },
      ],
    },
  };
