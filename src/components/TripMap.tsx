"use client";

import { useMemo } from "react";
import Map, { Layer, Source } from "react-map-gl/maplibre";

import { useLocation } from "@/src/hooks/useLocation";
import { useTripStore } from "@/src/store/useTripStore";

import "maplibre-gl/dist/maplibre-gl.css";

/** Free vector style (no API token). Carto basemap; OpenStreetMap contributors. */
const MAP_STYLE =
  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

export default function TripMap() {
  useLocation();

  const route = useTripStore((s) => s.route);
  const isTracking = useTripStore((s) => s.isTracking);

  const lineFeature = useMemo(() => {
    if (route.length < 2) return null;
    return {
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "LineString" as const,
        coordinates: route,
      },
    };
  }, [route]);

  return (
    <div className="fixed inset-0 z-0">
      <Map
        mapStyle={MAP_STYLE}
        initialViewState={{
          longitude: -98.5,
          latitude: 39.8,
          zoom: 4,
        }}
        style={{ width: "100%", height: "100%" }}
      >
        {lineFeature ? (
          <Source id="trip-route" type="geojson" data={lineFeature}>
            <Layer
              id="trip-route-line"
              type="line"
              paint={{
                "line-color": "#2563eb",
                "line-width": 5,
                "line-opacity": 0.95,
              }}
            />
          </Source>
        ) : null}
      </Map>

      <button
        type="button"
        onClick={() =>
          useTripStore.setState((s) => ({ isTracking: !s.isTracking }))
        }
        className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 rounded-full bg-zinc-900 px-8 py-3 text-base font-semibold text-white shadow-lg ring-1 ring-white/10 transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:ring-black/10 dark:hover:bg-white"
      >
        {isTracking ? "Stop" : "Start"}
      </button>
    </div>
  );
}
