"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import Map, { Layer, Marker, Source, type MapRef } from "react-map-gl/maplibre";

import type { PlanRouteHighlight } from "@/src/lib/plannerHighlights";
import { boundsFromCoordinates } from "@/src/lib/plannerRouteSample";

import "maplibre-gl/dist/maplibre-gl.css";

const MAP_STYLE =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

export type PlanRouteMapProps = {
  routeCoordinates: [number, number][];
  startCoord: [number, number];
  endCoord: [number, number];
  highlights: PlanRouteHighlight[];
};

export default function PlanRouteMap({
  routeCoordinates,
  startCoord,
  endCoord,
  highlights,
}: PlanRouteMapProps) {
  const mapRef = useRef<MapRef>(null);

  const lineFeature = useMemo(() => {
    if (routeCoordinates.length < 2) return null;
    return {
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "LineString" as const,
        coordinates: routeCoordinates,
      },
    };
  }, [routeCoordinates]);

  const highlightsFc = useMemo(() => {
    if (highlights.length === 0) return null;
    return {
      type: "FeatureCollection" as const,
      features: highlights.map((h) => ({
        type: "Feature" as const,
        properties: { kind: h.kind },
        geometry: {
          type: "Point" as const,
          coordinates: [h.lng, h.lat] as [number, number],
        },
      })),
    };
  }, [highlights]);

  const fitRoute = useCallback(() => {
    if (routeCoordinates.length < 2) return;
    const b = boundsFromCoordinates(routeCoordinates);
    if (!b) return;
    const map = mapRef.current;
    if (!map) return;
    const pad = { top: 56, bottom: 56, left: 48, right: 48 };
    map.fitBounds(
      [
        [b[0][0], b[0][1]],
        [b[1][0], b[1][1]],
      ],
      { padding: pad, duration: 650, maxZoom: 12 }
    );
  }, [routeCoordinates]);

  useEffect(() => {
    fitRoute();
  }, [fitRoute]);

  const [sLng, sLat] = startCoord;
  const [eLng, eLat] = endCoord;

  return (
    <div
      className="relative isolate z-0 h-[min(280px,42dvh)] w-full shrink-0 overflow-hidden rounded-2xl border border-zinc-700/80 shadow-xl ring-1 ring-white/10 sm:h-[300px]"
      style={{ contain: "layout paint" }}
    >
      <Map
        ref={mapRef}
        mapStyle={MAP_STYLE}
        initialViewState={{
          longitude: (sLng + eLng) / 2,
          latitude: (sLat + eLat) / 2,
          zoom: 6,
        }}
        style={{ width: "100%", height: "100%", position: "relative" }}
        onLoad={fitRoute}
      >
        {lineFeature ? (
          <Source id="plan-route-glow" type="geojson" data={lineFeature}>
            <Layer
              id="plan-route-glow-line"
              type="line"
              layout={{ "line-cap": "round", "line-join": "round" }}
              paint={{
                "line-color": "#a5b4fc",
                "line-width": 10,
                "line-opacity": 0.35,
              }}
            />
          </Source>
        ) : null}
        {lineFeature ? (
          <Source id="plan-route" type="geojson" data={lineFeature}>
            <Layer
              id="plan-route-line"
              type="line"
              layout={{ "line-cap": "round", "line-join": "round" }}
              paint={{
                "line-color": "#818cf8",
                "line-width": 4,
                "line-opacity": 1,
              }}
            />
          </Source>
        ) : null}
        {highlightsFc ? (
          <Source id="plan-highlights" type="geojson" data={highlightsFc}>
            <Layer
              id="plan-highlights-halo"
              type="circle"
              paint={{
                "circle-radius": 11,
                "circle-color": "#ffffff",
                "circle-opacity": 0.2,
              }}
            />
            <Layer
              id="plan-highlights-dot"
              type="circle"
              paint={{
                "circle-radius": 6,
                "circle-color": [
                  "match",
                  ["get", "kind"],
                  "scenic",
                  "#22c55e",
                  "attraction",
                  "#c084fc",
                  "place",
                  "#38bdf8",
                  "#94a3b8",
                ],
                "circle-stroke-width": 2,
                "circle-stroke-color": "#0f172a",
              }}
            />
          </Source>
        ) : null}

        <Marker longitude={sLng} latitude={sLat} anchor="bottom">
          <span className="flex flex-col items-center">
            <span className="rounded-full border-2 border-white bg-emerald-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-lg">
              Start
            </span>
            <span className="-mt-0.5 h-2 w-2 rounded-full border-2 border-white bg-emerald-500 shadow-md" />
          </span>
        </Marker>
        <Marker longitude={eLng} latitude={eLat} anchor="bottom">
          <span className="flex flex-col items-center">
            <span className="rounded-full border-2 border-white bg-rose-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-lg">
              End
            </span>
            <span className="-mt-0.5 h-2 w-2 rounded-full border-2 border-white bg-rose-500 shadow-md" />
          </span>
        </Marker>
      </Map>
    </div>
  );
}
