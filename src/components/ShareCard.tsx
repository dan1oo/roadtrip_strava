"use client";

import { toPng } from "html-to-image";
import { useMemo, useRef, useState } from "react";

import { mapboxAccessToken } from "@/src/lib/mapbox";
import type { LngLat } from "@/src/store/useTripStore";

/** Instagram Story aspect (9:16). Mapbox static max dimension is 1280px. */
const STATIC_W = 720;
const STATIC_H = 1280;
const MAPBOX_STYLE = "mapbox/dark-v11";
const MAX_ROUTE_POINTS = 80;

/** Renders a PNG data URL of the given DOM node (for social sharing). */
export async function captureShareCardAsPng(
  element: HTMLElement
): Promise<string> {
  return toPng(element, {
    cacheBust: true,
    pixelRatio: 2,
    quality: 1,
    backgroundColor: "#020617",
  });
}

function simplifyRoute(route: LngLat[], maxPoints: number): LngLat[] {
  if (route.length <= maxPoints) return route;
  const out: LngLat[] = [];
  const last = route.length - 1;
  for (let i = 0; i < maxPoints; i++) {
    const t = i / (maxPoints - 1);
    const idx = Math.min(Math.round(t * last), last);
    out.push(route[idx]);
  }
  return out;
}

function buildMapboxStaticImageUrl(
  route: LngLat[],
  accessToken: string
): string | null {
  if (!accessToken) return null;

  if (route.length >= 2) {
    const coords = simplifyRoute(route, MAX_ROUTE_POINTS);
    const feature = {
      type: "Feature" as const,
      properties: {
        stroke: "#3b82f6",
        "stroke-width": 5,
        "stroke-opacity": 1,
      },
      geometry: {
        type: "LineString" as const,
        coordinates: coords,
      },
    };
    const encoded = encodeURIComponent(JSON.stringify(feature));
    return `https://api.mapbox.com/styles/v1/${MAPBOX_STYLE}/static/geojson(${encoded})/auto/${STATIC_W}x${STATIC_H}@2x?padding=80&access_token=${accessToken}`;
  }

  if (route.length === 1) {
    const [lng, lat] = route[0];
    const feature = {
      type: "Feature" as const,
      properties: { "marker-color": "#3b82f6" },
      geometry: {
        type: "Point" as const,
        coordinates: [lng, lat],
      },
    };
    const encoded = encodeURIComponent(JSON.stringify(feature));
    return `https://api.mapbox.com/styles/v1/${MAPBOX_STYLE}/static/geojson(${encoded})/auto/${STATIC_W}x${STATIC_H}@2x?padding=80&access_token=${accessToken}`;
  }

  return `https://api.mapbox.com/styles/v1/${MAPBOX_STYLE}/static/-98.5,39.8,3/${STATIC_W}x${STATIC_H}@2x?access_token=${accessToken}`;
}

/**
 * Scenery score 0–100 from elevation gain (ft) per mile — hillier trips score higher.
 */
export function computeSceneryScore(
  elevationGainFt: number,
  distanceMi: number
): number {
  if (distanceMi < 0.01 || elevationGainFt <= 0) return 0;
  const ftPerMi = elevationGainFt / distanceMi;
  return Math.min(100, Math.round((ftPerMi / 150) * 100));
}

function formatMi(n: number): string {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function formatFt(n: number): string {
  return Math.round(n).toLocaleString();
}

type ShareCardProps = {
  distanceMi: number;
  elevationGainFt: number;
  route: LngLat[];
  className?: string;
};

export default function ShareCard({
  distanceMi,
  elevationGainFt,
  route,
  className = "",
}: ShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"idle" | "copying" | "error">("idle");

  const mapUrl = useMemo(
    () => buildMapboxStaticImageUrl(route, mapboxAccessToken),
    [route]
  );

  const sceneryScore = useMemo(
    () => computeSceneryScore(elevationGainFt, distanceMi),
    [elevationGainFt, distanceMi]
  );

  async function handleSavePng() {
    if (!cardRef.current) return;
    setStatus("copying");
    try {
      const dataUrl = await captureShareCardAsPng(cardRef.current);
      const link = document.createElement("a");
      link.download = `road-strava-trip-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div
        ref={cardRef}
        className="relative mx-auto w-full max-w-[min(100%,320px)] overflow-hidden rounded-2xl shadow-2xl"
        style={{ aspectRatio: "9 / 16" }}
      >
        <div
          className="absolute inset-0 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900"
          aria-hidden
        />
        <div className="relative flex h-full flex-col p-5 text-white">
          <div className="mb-4 overflow-hidden rounded-xl border border-white/10 bg-black/20 shadow-inner ring-1 ring-white/5">
            {mapUrl ? (
              // Native <img> keeps Mapbox static + html-to-image capture predictable (CORS).
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={mapUrl}
                alt=""
                width={STATIC_W}
                height={STATIC_H}
                className="h-auto w-full object-cover"
                crossOrigin="anonymous"
                draggable={false}
              />
            ) : (
              <div className="flex aspect-[720/1280] w-full items-center justify-center bg-slate-900 px-4 text-center text-xs text-slate-400">
                Add{" "}
                <code className="mx-1 rounded bg-white/10 px-1">
                  NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
                </code>{" "}
                for a static route map on this card.
              </div>
            )}
          </div>

          <div className="flex flex-1 flex-col justify-center gap-6">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-400">
                Total miles
              </p>
              <p className="text-4xl font-black tabular-nums tracking-tight text-white">
                {formatMi(distanceMi)}
                <span className="ml-2 text-2xl font-bold text-slate-300">
                  mi
                </span>
              </p>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-400">
                Elevation gain
              </p>
              <p className="text-4xl font-black tabular-nums tracking-tight text-white">
                {formatFt(elevationGainFt)}
                <span className="ml-2 text-2xl font-bold text-slate-300">
                  ft
                </span>
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
              <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-400">
                Scenery score
              </p>
              <p className="mt-1 text-3xl font-black tabular-nums text-emerald-400">
                {sceneryScore}
                <span className="text-lg font-bold text-slate-400"> / 100</span>
              </p>
            </div>
          </div>

          <p className="mt-auto pt-4 text-center text-[11px] font-semibold uppercase tracking-[0.4em] text-slate-500">
            Road Strava
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleSavePng}
        disabled={status === "copying"}
        className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-emerald-500 disabled:opacity-60"
      >
        {status === "copying" ? "Saving…" : "Save story PNG"}
      </button>
      {status === "error" ? (
        <p className="text-center text-xs text-red-500">
          Could not capture image. Try again after the map loads.
        </p>
      ) : null}
    </div>
  );
}
