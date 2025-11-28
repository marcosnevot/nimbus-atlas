// src/features/map/MapRoot.tsx
import React, { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import type { Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import {
  MAP_STYLE_URL,
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
} from "../../config/map.config";

export type MapCoordinates = {
  lng: number;
  lat: number;
};

export type MapViewport = {
  center: MapCoordinates;
  zoom: number;
  bearing: number;
  pitch: number;
};

export type MapRootProps = {
  initialCenter?: MapCoordinates;
  initialZoom?: number;
  markers?: MapCoordinates[];
  onViewportChange?: (viewport: MapViewport) => void;
  onMapClick?: (coords: MapCoordinates) => void;
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
  const viewportCallbackRef =
    useRef<MapRootProps["onViewportChange"]>();
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

    const emitViewport = () => {
      const center = map.getCenter();
      const viewport: MapViewport = {
        center: { lng: center.lng, lat: center.lat },
        zoom: map.getZoom(),
        bearing: map.getBearing(),
        pitch: map.getPitch(),
      };

      const cb = viewportCallbackRef.current;
      if (cb) {
        cb(viewport);
      }
    };

    const handleLoad = () => {
      const cb = readyCallbackRef.current;
      if (cb) {
        cb();
      }
      emitViewport();
    };

    const handleMoveEnd = () => {
      emitViewport();
    };

    const handleClick = (
      event: maplibregl.MapMouseEvent & maplibregl.EventData
    ) => {
      const { lng, lat } = event.lngLat;
      const cb = clickCallbackRef.current;
      if (cb) {
        cb({ lng, lat });
      }
    };

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
      map.off("load", handleLoad);
      map.off("moveend", handleMoveEnd);
      map.off("click", handleClick);

      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      map.remove();
      mapRef.current = null;
    };
  }, [initialCenter.lng, initialCenter.lat, initialZoom]);

  // Markers update: re-run whenever markers change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove previous markers
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
