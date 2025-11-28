// src/integrations/weather/openWeatherClient.ts

export type OpenWeatherUnits = 'standard' | 'metric' | 'imperial';

export interface OpenWeatherCurrentRequestParams {
  lat: number;
  lon: number;
  apiKey: string;
  units?: OpenWeatherUnits;
  lang?: string;
}

/**
 * Builds the URL for OpenWeather One Call 3.0 current weather.
 *
 * Notes:
 * - Uses `exclude=minutely,hourly,daily,alerts` to focus on current weather only.
 * - Does not perform any network request; it only builds the URL.
 */
export function buildOpenWeatherCurrentUrl(
  params: OpenWeatherCurrentRequestParams,
): string {
  const { lat, lon, apiKey, units = 'metric', lang } = params;

  const baseUrl = 'https://api.openweathermap.org/data/3.0/onecall';
  const url = new URL(baseUrl);

  url.searchParams.set('lat', lat.toString());
  url.searchParams.set('lon', lon.toString());
  url.searchParams.set('appid', apiKey);
  url.searchParams.set('units', units);
  url.searchParams.set('exclude', 'minutely,hourly,daily,alerts');

  if (lang) {
    url.searchParams.set('lang', lang);
  }

  return url.toString();
}
