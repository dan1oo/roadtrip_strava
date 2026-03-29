"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import ShareCard, {
  captureShareCardAsPng,
} from "@/src/components/ShareCard";
import TripMapDynamic from "@/src/components/TripMapDynamic";
import {
  getTripDurationMs,
  useTripStore,
} from "@/src/store/useTripStore";

function formatDurationClock(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export default function TripPage() {
  const shareCardRef = useRef<HTMLDivElement>(null);
  const [tick, setTick] = useState(0);
  const [exportStatus, setExportStatus] = useState<"idle" | "busy" | "error">(
    "idle"
  );

  const isTracking = useTripStore((s) => s.isTracking);
  const route = useTripStore((s) => s.route);
  const distance = useTripStore((s) => s.distance);
  const elevationGain = useTripStore((s) => s.elevationGain);
  const toggleTracking = useTripStore((s) => s.toggleTracking);
  const resetTrip = useTripStore((s) => s.resetTrip);

  const durationMs = useTripStore((s) => getTripDurationMs(s));

  useEffect(() => {
    if (!isTracking) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [isTracking]);

  const showStats =
    isTracking || route.length > 0 || distance > 0 || elevationGain > 0;

  const handleExportPng = useCallback(async () => {
    if (!shareCardRef.current) return;
    setExportStatus("busy");
    try {
      const dataUrl = await captureShareCardAsPng(shareCardRef.current);
      const link = document.createElement("a");
      link.download = `road-strava-trip-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      setExportStatus("idle");
    } catch {
      setExportStatus("error");
    }
  }, []);

  return (
    <section className="flex h-full flex-col">
      <header className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <h1 className="text-lg font-semibold">Road Trip Tracker</h1>
        {showStats ? (
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Time
              </p>
              <p
                key={tick}
                className="text-sm font-bold tabular-nums text-zinc-900 dark:text-zinc-100"
              >
                {formatDurationClock(durationMs)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Distance
              </p>
              <p className="text-sm font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
                {distance.toFixed(2)} mi
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Elevation
              </p>
              <p className="text-sm font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
                {Math.round(elevationGain).toLocaleString()} ft
              </p>
            </div>
          </div>
        ) : null}
      </header>

      <div className="relative flex-1">
        <TripMapDynamic />
      </div>

      <div className="grid grid-cols-1 gap-2 border-t border-zinc-200 p-3 dark:border-zinc-800">
        <button
          type="button"
          onClick={toggleTracking}
          className={`rounded-xl px-4 py-3 text-sm font-semibold ${
            isTracking
              ? "bg-red-600 text-white hover:bg-red-500"
              : "bg-blue-600 text-white hover:bg-blue-500"
          }`}
        >
          {isTracking ? "Stop Trip" : "Start Trip"}
        </button>

        {!isTracking && route.length > 0 ? (
          <>
            <button
              type="button"
              onClick={handleExportPng}
              disabled={exportStatus === "busy"}
              className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
            >
              {exportStatus === "busy" ? "Exporting…" : "Export story PNG"}
            </button>
            {exportStatus === "error" ? (
              <p className="text-center text-xs text-red-500">
                Could not export. Wait for the map to load and try again.
              </p>
            ) : null}
            <button
              type="button"
              onClick={resetTrip}
              className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Reset
            </button>
          </>
        ) : null}
      </div>

      {/* Off-screen: story card for html-to-image (must stay painted, not opacity-0) */}
      <div
        className="pointer-events-none fixed -left-[9999px] top-0 z-0"
        aria-hidden
      >
        <ShareCard
          ref={shareCardRef}
          distanceMi={distance}
          elevationGainFt={elevationGain}
          durationMs={durationMs}
          route={route}
        />
      </div>
    </section>
  );
}
