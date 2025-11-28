// src/entities/weather/weatherAlert.ts

import type { Location } from '../location/location';
import type { ProviderMetadata, DataQuality } from './currentWeather';

export type WeatherAlertSeverity =
  | 'minor'
  | 'moderate'
  | 'severe'
  | 'extreme'
  | 'unknown';

export interface WeatherAlert {
  id: string;
  location: Location;
  title: string;
  description?: string;
  severity: WeatherAlertSeverity;
  startsAt?: string; // ISO 8601 UTC
  endsAt?: string; // ISO 8601 UTC
  source?: string;
  category?: string;
  tags?: string[];
  providerMetadata?: ProviderMetadata;
  dataQuality?: DataQuality;
}

export type WeatherAlertsAdapterResult =
  | { kind: 'success'; data: WeatherAlert[] }
  | { kind: 'contract-error'; error: string };
