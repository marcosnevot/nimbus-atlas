// tests/fixtures/openWeatherAlertsFixture.ts

import type {
  OpenWeatherAlertsEnvelope,
} from '../../src/integrations/weather/openWeatherAlertsTypes';

export const openWeatherAlertsSuccessFixture: OpenWeatherAlertsEnvelope = {
  lat: 40.4168,
  lon: -3.7038,
  timezone: 'Europe/Madrid',
  timezone_offset: 3600,
  alerts: [
    {
      sender_name: 'AEMET',
      event: 'Orange wind warning',
      start: 1700000000,
      end: 1700007200,
      description: 'Strong winds expected in the area.',
      tags: ['Severe', 'Wind'],
    },
    {
      sender_name: 'AEMET',
      event: 'Yellow rain advisory',
      start: 1700010000,
      end: 1700017200,
      description: 'Moderate rain expected.',
      tags: ['Advisory', 'Rain'],
    },
  ],
};

export const openWeatherAlertsPartialFixture: OpenWeatherAlertsEnvelope = {
  lat: 40.4168,
  lon: -3.7038,
  timezone: 'Europe/Madrid',
  timezone_offset: 3600,
  alerts: [
    {
      // missing event, description and end
      sender_name: 'AEMET',
      start: 1700020000,
      tags: ['Advisory'],
    },
  ],
};

export const openWeatherAlertsEmptyFixture: OpenWeatherAlertsEnvelope = {
  lat: 40.4168,
  lon: -3.7038,
  timezone: 'Europe/Madrid',
  timezone_offset: 3600,
  alerts: [],
};
