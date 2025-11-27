// src/features/map/MapRoot.tsx
import React, { useEffect, useRef } from "react";
import maplibregl, { Map as MapLibreMap } from "maplibre-gl";
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
  onViewportChange?: (viewport: MapViewport) => void;
  onMapClick?: (coords: MapCoordinates) => void;
  onMapReady?: () => void;
  className?: string;
};

export const MapRoot: React.FC<MapRootProps> = ({
  initialCenter = DEFAULT_MAP_CENTER,
  initialZoom = DEFAULT_MAP_ZOOM,
  onViewportChange,
  onMapClick,
  onMapReady,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
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
      onViewportChange?.(viewport);
    };

    const handleLoad = () => {
      console.debug("[MapRoot] Map loaded");
      onMapReady?.();
      emitViewport();
    };

    const handleMoveEnd = () => {
      emitViewport();
    };

    const handleClick = (
      event: maplibregl.MapMouseEvent & maplibregl.EventData
    ) => {
      const { lng, lat } = event.lngLat;
      onMapClick?.({ lng, lat });
    };

    map.on("load", handleLoad);
    map.on("moveend", handleMoveEnd);
    map.on("click", handleClick);
    map.on("error", (event) => {
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
      map.remove();
      mapRef.current = null;
    };
  }, [
    initialCenter.lng,
    initialCenter.lat,
    initialZoom,
    onMapClick,
    onMapReady,
    onViewportChange,
  ]);

  const classes = ["na-map-root", className].filter(Boolean).join(" ");

  return <div ref={containerRef} className={classes} />;
};
