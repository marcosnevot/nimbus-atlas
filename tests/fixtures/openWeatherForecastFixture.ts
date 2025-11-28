// tests/fixtures/openWeatherForecastFixture.ts

import type { OpenWeatherForecastResponse } from '../../src/integrations/weather/openWeatherForecastTypes';

export const openWeatherForecastSuccessFixture: OpenWeatherForecastResponse = {
  lat: 40.4168,
  lon: -3.7038,
  timezone: 'Europe/Madrid',
  timezone_offset: 3600,
  hourly: [
    {
      dt: 1700000000,
      temp: 18,
      feels_like: 17.5,
      pressure: 1015,
      humidity: 60,
      wind_speed: 3,
      wind_deg: 230,
      clouds: 20,
      visibility: 10000,
      pop: 0.1,
      weather: [
        {
          id: 801,
          main: 'Clouds',
          description: 'few clouds',
          icon: '02d',
        },
      ],
    },
    {
      dt: 1700003600,
      temp: 19,
      feels_like: 18.5,
      pressure: 1014,
      humidity: 58,
      wind_speed: 3.2,
      wind_deg: 240,
      clouds: 30,
      visibility: 10000,
      pop: 0.2,
      weather: [
        {
          id: 802,
          main: 'Clouds',
          description: 'scattered clouds',
          icon: '03d',
        },
      ],
    },
    // more entries could be added; adapter will downsample to 3h
  ],
  daily: [
    {
      dt: 1700000000,
      temp: {
        day: 20,
        min: 15,
        max: 22,
      },
      feels_like: {
        day: 19,
      },
      pressure: 1015,
      humidity: 55,
      wind_speed: 4,
      wind_deg: 260,
      clouds: 30,
      pop: 0.25,
      weather: [
        {
          id: 800,
          main: 'Clear',
          description: 'clear sky',
          icon: '01d',
        },
      ],
    },
    {
      dt: 1700086400,
      temp: {
        day: 21,
        min: 16,
        max: 23,
      },
      feels_like: {
        day: 20,
      },
      pressure: 1016,
      humidity: 50,
      wind_speed: 3.5,
      wind_deg: 250,
      clouds: 20,
      pop: 0.1,
      weather: [
        {
          id: 801,
          main: 'Clouds',
          description: 'few clouds',
          icon: '02d',
        },
      ],
    },
  ],
};

export const openWeatherForecastNoDataFixture: OpenWeatherForecastResponse = {
  lat: 40.4168,
  lon: -3.7038,
  timezone: 'Europe/Madrid',
  timezone_offset: 3600,
  hourly: [],
  daily: [],
};
