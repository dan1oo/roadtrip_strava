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
    <div className="h-full w-full">
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
    </div>
  );
}
