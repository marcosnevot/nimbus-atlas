// src/hooks/useSelectedLocationAlerts.ts

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

export function useSelectedLocationAlerts() {
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
      lon: rawSelectedLocation.lng,
    };
  }, [rawSelectedLocation]);

  const ensureAlerts = useWeatherStore((state) => state.ensureAlerts);

  const locationKey = useMemo(
    () => (location ? buildLocationKey(location) : null),
    [location]
  );

  const resource = useWeatherStore((state) =>
    locationKey ? state.alertsByLocationKey[locationKey] : undefined
  );

  useEffect(() => {
    if (!location) return;
    void ensureAlerts(location);
  }, [locationKey, location, ensureAlerts]);

  return {
    location,
    resource,
  };
}
