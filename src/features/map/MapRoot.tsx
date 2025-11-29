// src/features/map/MapRoot.tsx
import React, { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import type { Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import {
  MAP_STYLE_URL,
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  MAP_PROJECTION_TYPE,
} from "../../config/map.config";

export type MapCoordinates = {
  lng: number;
  lat: number;
};

export type MapBounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};

export type MapViewport = {
  center: MapCoordinates;
  zoom: number;
  bearing: number;
  pitch: number;
  bounds?: MapBounds;
};

export type MapSelectedLocation = MapCoordinates & {
  name?: string;
  countryCode?: string;
};

export type MapRootProps = {
  initialCenter?: MapCoordinates;
  initialZoom?: number;
  /** Legacy simple markers (small dots). */
  markers?: MapCoordinates[];
  onViewportChange?: (viewport: MapViewport) => void;
  onMapClick?: (location: MapSelectedLocation) => void;
  onMapReady?: () => void;
  className?: string;
};

export const MapRoot: React.FC<MapRootProps> = ({
  initialCenter = DEFAULT_MAP_CENTER,
  initialZoom = DEFAULT_MAP_ZOOM,
  markers,
  onViewportChange,
  onMapClick,
  onMapReady,
  className,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  // Keep latest callbacks in refs so we do not need them in the init effect deps
  const viewportCallbackRef = useRef<MapRootProps["onViewportChange"]>();
  const clickCallbackRef = useRef<MapRootProps["onMapClick"]>();
  const readyCallbackRef = useRef<MapRootProps["onMapReady"]>();

  useEffect(() => {
    viewportCallbackRef.current = onViewportChange;
  }, [onViewportChange]);

  useEffect(() => {
    clickCallbackRef.current = onMapClick;
  }, [onMapClick]);

  useEffect(() => {
    readyCallbackRef.current = onMapReady;
  }, [onMapReady]);

  const emitViewport = (map: MapLibreMap) => {
    const center = map.getCenter();
    const bounds = map.getBounds();

    const viewport: MapViewport = {
      center: { lng: center.lng, lat: center.lat },
      zoom: map.getZoom(),
      bearing: map.getBearing(),
      pitch: map.getPitch(),
      bounds: {
        west: bounds.getWest(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        north: bounds.getNorth(),
      },
    };

    const cb = viewportCallbackRef.current;
    if (cb) {
      cb(viewport);
    }
  };

  // Helper: pick best "place" feature near the click
  function pickBestPlaceFeature(
    features: maplibregl.MapboxGeoJSONFeature[]
  ): maplibregl.MapboxGeoJSONFeature | undefined {
    const placeFeatures = features.filter((feature) => {
      const props = feature.properties as Record<string, unknown> | undefined;
      if (!props) return false;

      const name =
        (props["name:es"] as string | undefined) ??
        (props["name:en"] as string | undefined) ??
        (props.name as string | undefined);

      if (!name) return false;

      const layerId = feature.layer?.id ?? "";
      const classValue = String(props.class ?? "");

      const isPlaceLayer =
        layerId.includes("place") ||
        layerId.includes("settlement") ||
        layerId.includes("city") ||
        layerId.includes("town");

      const isPlaceClass = [
        "city",
        "town",
        "village",
        "hamlet",
        "suburb",
        "neighbourhood",
        "locality",
      ].includes(classValue);

      return isPlaceLayer || isPlaceClass;
    });

    if (placeFeatures.length === 0) return undefined;

    const classPriority: Record<string, number> = {
      city: 4,
      town: 3,
      village: 2,
      suburb: 1,
      hamlet: 0,
    };

    placeFeatures.sort((a, b) => {
      const propsA = a.properties as any;
      const propsB = b.properties as any;

      const classA = String(propsA?.class ?? "");
      const classB = String(propsB?.class ?? "");
      const rankA = classPriority[classA] ?? -1;
      const rankB = classPriority[classB] ?? -1;

      if (rankA !== rankB) {
        return rankB - rankA;
      }

      const popA =
        (propsA?.population as number | undefined) ??
        (propsA?.pop as number | undefined) ??
        0;
      const popB =
        (propsB?.population as number | undefined) ??
        (propsB?.pop as number | undefined) ??
        0;

      return popB - popA;
    });

    return placeFeatures[0];
  }

  function extractPlaceMetadata(
    feature: maplibregl.MapboxGeoJSONFeature | undefined
  ): { name?: string; countryCode?: string } {
    if (!feature || !feature.properties) {
      return {};
    }

    const props = feature.properties as Record<string, unknown>;

    const name =
      (props["name:es"] as string | undefined) ??
      (props["name:en"] as string | undefined) ??
      (props.name as string | undefined);

    const countryCode =
      (props.iso_3166_1 as string | undefined) ??
      (props["iso_3166_1:alpha2"] as string | undefined) ??
      (props.country_code as string | undefined) ??
      (props.iso_a2 as string | undefined);

    return { name, countryCode };
  }

  // Map initialization: run once (or if initial center/zoom really change)
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: MAP_STYLE_URL,
      center: [initialCenter.lng, initialCenter.lat],
      zoom: initialZoom,
      attributionControl: true,
    });

    mapRef.current = map;

    const handleStyleLoad = () => {
      // Important: set projection after style is loaded
      if (MAP_PROJECTION_TYPE === "globe" && (map as any).setProjection) {
        (map as any).setProjection({ type: "globe" } as any);
      }
    };

    const handleLoad = () => {
      const cb = readyCallbackRef.current;
      if (cb) {
        cb();
      }
      emitViewport(map);
    };

    const handleMoveEnd = () => {
      emitViewport(map);
    };

    const handleClick = (
      event: maplibregl.MapMouseEvent & maplibregl.EventData
    ) => {
      const { lng, lat } = event.lngLat;

      const cb = clickCallbackRef.current;
      if (!cb) {
        return;
      }

      let name: string | undefined;
      let countryCode: string | undefined;

      try {
        const clickPoint = event.point;
        const padding = 8;

        const queryBox: [maplibregl.PointLike, maplibregl.PointLike] = [
          [clickPoint.x - padding, clickPoint.y - padding],
          [clickPoint.x + padding, clickPoint.y + padding],
        ];

        const features = map.queryRenderedFeatures(
          queryBox
        ) as maplibregl.MapboxGeoJSONFeature[];

        const bestPlace = pickBestPlaceFeature(features);
        const meta = extractPlaceMetadata(bestPlace);

        name = meta.name;
        countryCode = meta.countryCode;
      } catch (error) {
        // Fallback: coordinates only
        // eslint-disable-next-line no-console
        console.warn("[MapRoot] Failed to extract place metadata from click", error);
      }

      cb({
        lng,
        lat,
        name,
        countryCode,
      });
    };

    map.on("style.load", handleStyleLoad);
    map.on("load", handleLoad);
    map.on("moveend", handleMoveEnd);
    map.on("click", handleClick);
    map.on("error", (event) => {
      // This is fine for dev; in production we would route this to logging infra
      console.error("[MapRoot] Map error", event);
    });

    const navigationControl = new maplibregl.NavigationControl({
      visualizePitch: true,
    });
    map.addControl(navigationControl, "top-right");

    return () => {
      map.off("style.load", handleStyleLoad);
      map.off("load", handleLoad);
      map.off("moveend", handleMoveEnd);
      map.off("click", handleClick);

      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      map.remove();
      mapRef.current = null;
    };
  }, [initialCenter.lng, initialCenter.lat, initialZoom]);

  // Legacy small dot markers (if any)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    if (!markers || markers.length === 0) {
      return;
    }

    markers.forEach((coords) => {
      const el = document.createElement("div");
      el.className = "na-map-marker";

      const marker = new maplibregl.Marker(el)
        .setLngLat([coords.lng, coords.lat])
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [markers]);

  const classes = ["na-map-root", className].filter(Boolean).join(" ");

  return (
    <div
      ref={mapContainerRef}
      className={classes}
      data-testid="na-map-root"
    />
  );
};
