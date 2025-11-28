// src/entities/location/location.ts

export type LocationSource =
  | 'geolocation'
  | 'search'
  | 'map-click'
  | 'preset'
  | 'provider';

export interface Location {
  id: string;
  lat: number;
  lon: number;
  name?: string;
  countryCode?: string;
  timezone?: string;
  source: LocationSource;
}
