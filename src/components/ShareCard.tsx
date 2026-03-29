"use client";

import { toPng } from "html-to-image";
import { forwardRef } from "react";

import ShareRouteMapCanvas from "@/src/components/ShareRouteMapCanvas";
import type { LngLat } from "@/src/store/useTripStore";

/** Logical card width for story layout (html-to-image scales with pixelRatio). */
const CARD_W = 320;

async function waitForShareMapReady(
  root: HTMLElement,
  timeoutMs = 20000
): Promise<void> {
  const start = performance.now();
  while (performance.now() - start < timeoutMs) {
    const el = root.querySelector('[data-share-map-ready="true"]');
    if (el) return;
    await new Promise((r) => setTimeout(r, 40));
  }
}

/** Renders a PNG data URL of the given DOM node (for social sharing). */
export async function captureShareCardAsPng(
  element: HTMLElement
): Promise<string> {
  await waitForShareMapReady(element);
  return toPng(element, {
    cacheBust: true,
    pixelRatio: 2,
    quality: 1,
    backgroundColor: "#020617",
  });
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

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export type ShareCardProps = {
  distanceMi: number;
  elevationGainFt: number;
  durationMs: number;
  route: LngLat[];
  highlights: LngLat[];
  className?: string;
};

/**
 * 9:16 story card for PNG export only — render off-screen and pass to
 * `captureShareCardAsPng`. Map uses free Carto raster tiles (same OSM data
 * family as the in-app MapLibre basemap).
 */
const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(
  function ShareCard(
    {
      distanceMi,
      elevationGainFt,
      durationMs,
      route,
      highlights,
      className = "",
    },
    ref
  ) {
    return (
      <div
        ref={ref}
        className={`relative overflow-hidden rounded-2xl shadow-2xl ${className}`}
        style={{ width: CARD_W, aspectRatio: "9 / 16" }}
      >
        <div
          className="absolute inset-0 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900"
          aria-hidden
        />
        <div className="relative flex h-full flex-col p-5 text-white">
          <div className="mb-4 overflow-hidden rounded-xl border border-white/10 bg-black/20 shadow-inner ring-1 ring-white/5">
            <ShareRouteMapCanvas route={route} highlights={highlights} />
            <p className="border-t border-white/5 px-2 py-1.5 text-center text-[9px] leading-tight text-slate-500">
              Map: © OpenStreetMap contributors, © CARTO
            </p>
          </div>

          <div className="flex flex-1 flex-col justify-center gap-6">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-400">
                Time
              </p>
              <p className="text-4xl font-black tabular-nums tracking-tight text-white">
                {formatDuration(durationMs)}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-400">
                Distance
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
          </div>

          <p className="mt-auto pt-4 text-center text-[11px] font-semibold uppercase tracking-[0.4em] text-slate-500">
            Road Strava
          </p>
        </div>
      </div>
    );
  }
);

export default ShareCard;
