// src/integrations/weather/openWeatherTypes.ts

export interface OpenWeatherWeatherEntry {
  id: number;
  main: string;
  description: string;
  icon: string;
}

export interface OpenWeatherCurrentBlock {
  dt: number;
  temp: number;
  feels_like?: number;
  pressure?: number;
  humidity?: number;
  wind_speed?: number;
  wind_deg?: number;
  clouds?: number;
  visibility?: number;
  rain?: {
    '1h'?: number;
  };
  snow?: {
    '1h'?: number;
  };
  weather: OpenWeatherWeatherEntry[];
}

export interface OpenWeatherCurrentResponse {
  lat: number;
  lon: number;
  timezone: string;
  timezone_offset: number;
  current: OpenWeatherCurrentBlock;
}
