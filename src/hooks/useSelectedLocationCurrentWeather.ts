// src/hooks/useSelectedLocationCurrentWeather.ts

import { useEffect, useMemo } from "react";
import { useMapStore } from "../state/mapStore";
import type { MapCoordinates } from "../features/map/MapRoot";
import { useWeatherStore, buildLocationKey } from "../state/weatherStore";
import type { LocationRef } from "../entities/weather/models";

type MapSelectedLocation = MapCoordinates & {
  name?: string;
  countryCode?: string;
  timezone?: string;
};

export function useSelectedLocationCurrentWeather() {
  const rawSelectedLocation = useMapStore(
    (state) => state.selectedLocation as MapSelectedLocation | null
  );

  const location: LocationRef | null = useMemo(() => {
    if (!rawSelectedLocation) return null;

    return {
      id: undefined,
      name: rawSelectedLocation.name,
      countryCode: rawSelectedLocation.countryCode,
      timezone: rawSelectedLocation.timezone,
      lat: rawSelectedLocation.lat,
      lon: rawSelectedLocation.lng, // MapCoordinates uses `lng`
    };
  }, [rawSelectedLocation]);

  const ensureCurrentWeather = useWeatherStore(
    (state) => state.ensureCurrentWeather
  );

  const locationKey = useMemo(
    () => (location ? buildLocationKey(location) : null),
    [location]
  );

  const resource = useWeatherStore((state) =>
    locationKey ? state.currentByLocationKey[locationKey] : undefined
  );

  useEffect(() => {
    if (!location) return;
    void ensureCurrentWeather(location);
  }, [locationKey, location, ensureCurrentWeather]);

  return {
    location,
    resource,
  };
}
