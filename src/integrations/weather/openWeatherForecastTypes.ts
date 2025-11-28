// src/integrations/weather/openWeatherForecastTypes.ts

export interface OpenWeatherWeatherEntry {
  id: number;
  main: string;
  description: string;
  icon: string;
}

export interface OpenWeatherHourlyEntry {
  dt: number;
  temp: number;
  feels_like?: number;
  pressure?: number;
  humidity?: number;
  wind_speed?: number; // m/s
  wind_deg?: number;
  clouds?: number;
  visibility?: number;
  pop?: number; // 0..1
  weather: OpenWeatherWeatherEntry[];
}

export interface OpenWeatherDailyTemp {
  day: number;
  min: number;
  max: number;
}

export interface OpenWeatherDailyFeelsLike {
  day: number;
}

export interface OpenWeatherDailyEntry {
  dt: number;
  temp: OpenWeatherDailyTemp;
  feels_like?: OpenWeatherDailyFeelsLike;
  pressure?: number;
  humidity?: number;
  wind_speed?: number; // m/s
  wind_deg?: number;
  clouds?: number;
  pop?: number; // 0..1
  weather: OpenWeatherWeatherEntry[];
}

export interface OpenWeatherForecastResponse {
  lat: number;
  lon: number;
  timezone: string;
  timezone_offset: number;
  hourly?: OpenWeatherHourlyEntry[];
  daily?: OpenWeatherDailyEntry[];
}
