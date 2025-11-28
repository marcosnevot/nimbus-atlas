// src/integrations/weather/openWeatherAlertsTypes.ts

export interface OpenWeatherAlertEntry {
  sender_name?: string;
  event?: string;
  start?: number; // unix seconds
  end?: number; // unix seconds
  description?: string;
  tags?: string[];
}

export interface OpenWeatherAlertsEnvelope {
  lat: number;
  lon: number;
  timezone: string;
  timezone_offset: number;
  alerts?: OpenWeatherAlertEntry[];
}
