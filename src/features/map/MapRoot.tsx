// src/features/map/MapRoot.tsx
import React, { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import type { Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import {
  MAP_STYLE_URL_DARK,
  MAP_STYLE_URL_SATELLITE,
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
  /**
   * Called when the user clicks outside the visible globe (in "space").
   */
  onMapBackgroundClick?: () => void;
  onMapReady?: () => void;
  /** Base map style controlled from UI store ("Map" / "Satellite"). */
  baseMapStyle?: "dark" | "satellite";
  className?: string;
};

function isClickOutsideGlobe(
  map: MapLibreMap,
  event: maplibregl.MapMouseEvent & maplibregl.EventData
): boolean {
  // Only apply this heuristic in globe mode.
  if (MAP_PROJECTION_TYPE !== "globe") {
    return false;
  }

  const canvas = map.getCanvas() as HTMLCanvasElement | {
    clientWidth: number;
    clientHeight: number;
  };

  const width = (canvas as any).clientWidth ?? 0;
  const height = (canvas as any).clientHeight ?? 0;

  if (!width || !height) {
    return false;
  }

  const centerX = width / 2;
  const centerY = height / 2;
  const dx = event.point.x - centerX;
  const dy = event.point.y - centerY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  const radius = Math.min(width, height) / 2;
  const effectiveRadius = radius * 0.96; // small margin to keep horizon clicks "inside"

  return distance > effectiveRadius;
}

export const MapRoot: React.FC<MapRootProps> = ({
  initialCenter = DEFAULT_MAP_CENTER,
  initialZoom = DEFAULT_MAP_ZOOM,
  markers,
  onViewportChange,
  onMapClick,
  onMapBackgroundClick,
  onMapReady,
  baseMapStyle = "dark",
  className,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  // Keep latest callbacks in refs so we do not need them in the init effect deps
  const viewportCallbackRef = useRef<MapRootProps["onViewportChange"]>();
  const clickCallbackRef = useRef<MapRootProps["onMapClick"]>();
  const backgroundClickCallbackRef =
    useRef<MapRootProps["onMapBackgroundClick"]>();
  const readyCallbackRef = useRef<MapRootProps["onMapReady"]>();

  useEffect(() => {
    viewportCallbackRef.current = onViewportChange;
  }, [onViewportChange]);

  useEffect(() => {
    clickCallbackRef.current = onMapClick;
  }, [onMapClick]);

  useEffect(() => {
    backgroundClickCallbackRef.current = onMapBackgroundClick;
  }, [onMapBackgroundClick]);

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

    const initialStyleUrl =
      baseMapStyle === "satellite"
        ? MAP_STYLE_URL_SATELLITE
        : MAP_STYLE_URL_DARK;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: initialStyleUrl,
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

    const handleMouseMove = (
      event: maplibregl.MapMouseEvent & maplibregl.EventData
    ) => {
      const canvas = map.getCanvas();
      const hasClickHandler = Boolean(clickCallbackRef.current);

      if (!hasClickHandler) {
        (canvas as HTMLCanvasElement).style.cursor = "";
        return;
      }

      try {
        const movePoint = event.point;
        const padding = 8;

        const queryBox: [maplibregl.PointLike, maplibregl.PointLike] = [
          [movePoint.x - padding, movePoint.y - padding],
          [movePoint.x + padding, movePoint.y + padding],
        ];

        const features = map.queryRenderedFeatures(
          queryBox
        ) as maplibregl.MapboxGeoJSONFeature[];

        const bestPlace = pickBestPlaceFeature(features);

        (canvas as HTMLCanvasElement).style.cursor = bestPlace ? "pointer" : "";
      } catch {
        (canvas as HTMLCanvasElement).style.cursor = "";
      }
    };

    const handleClick = (
      event: maplibregl.MapMouseEvent & maplibregl.EventData
    ) => {
      const { lng, lat } = event.lngLat;

      const clickCb = clickCallbackRef.current;
      const backgroundCb = backgroundClickCallbackRef.current;

      // First: if the click is clearly outside the globe, treat it as "background".
      if (isClickOutsideGlobe(map, event)) {
        if (backgroundCb) {
          backgroundCb();
        }
        return;
      }

      if (!clickCb) {
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
        console.warn(
          "[MapRoot] Failed to extract place metadata from click",
          error
        );
      }

      clickCb({
        lng,
        lat,
        name,
        countryCode,
      });
    };

    const handleStyleImageMissing = (event: { id?: string }) => {
      const id = event?.id;
      if (typeof id !== "string") {
        return;
      }

      if (map.hasImage(id)) {
        return;
      }

      const size = 1;
      const data = new Uint8Array(size * size * 4);

      try {
        map.addImage(id, { width: size, height: size, data, pixelRatio: 1 });
      } catch {
      }
    };

    map.on("style.load", handleStyleLoad);
    map.on("load", handleLoad);
    map.on("moveend", handleMoveEnd);
    map.on("mousemove", handleMouseMove);
    map.on("click", handleClick);
    map.on("styleimagemissing", handleStyleImageMissing);
    map.on("error", (event) => {
      if (!import.meta.env.DEV) {
        return;
      }

      const err = (event as any).error;
      const msg = typeof err?.message === "string" ? err.message : "";

      // Ignore fetch abort noise when switching styles
      if (msg.includes("signal is aborted without reason")) {
        return;
      }

      // eslint-disable-next-line no-console
      console.error("[MapRoot] Map error", event);
    });

    const navigationControl = new maplibregl.NavigationControl({
      visualizePitch: true,
    });
    map.addControl(navigationControl, "top-left");

    return () => {
      map.off("style.load", handleStyleLoad);
      map.off("load", handleLoad);
      map.off("moveend", handleMoveEnd);
      map.off("mousemove", handleMouseMove);
      map.off("click", handleClick);

      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      map.remove();
      mapRef.current = null;
    };
  }, [initialCenter.lng, initialCenter.lat, initialZoom]);

  // React to base map style changes without recreating the map
  useEffect(() => {
    const map = mapRef.current;

    // In globe mode, strip `around` from easeTo options to avoid noisy warnings
    if (MAP_PROJECTION_TYPE === "globe") {
      const anyMap = map as any;
      if (typeof anyMap.easeTo === "function") {
        const originalEaseTo = anyMap.easeTo.bind(anyMap);
        anyMap.easeTo = (options: any, ...rest: any[]) => {
          if (options && typeof options === "object" && "around" in options) {
            const { around, ...safe } = options;
            return originalEaseTo(safe, ...rest);
          }
          return originalEaseTo(options, ...rest);
        };
      }
    }

    if (!map) return;

    const nextStyleUrl =
      baseMapStyle === "satellite"
        ? MAP_STYLE_URL_SATELLITE
        : MAP_STYLE_URL_DARK;

    try {
      // Disable style diffing to avoid internal MapLibre errors in console
      map.setStyle(nextStyleUrl, { diff: false });
    } catch (error) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.error("[MapRoot] Failed to switch base map style", error);
      }
    }
  }, [baseMapStyle]);

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
