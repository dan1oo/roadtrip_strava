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
  const [persistHydrated, setPersistHydrated] = useState(false);
  const [exportStatus, setExportStatus] = useState<"idle" | "busy" | "error">(
    "idle"
  );

  useEffect(() => {
    if (useTripStore.persist.hasHydrated()) {
      setPersistHydrated(true);
      return;
    }
    return useTripStore.persist.onFinishHydration(() => {
      setPersistHydrated(true);
    });
  }, []);

  const isTracking = useTripStore((s) => s.isTracking);
  const tripStatus = useTripStore((s) => s.tripStatus);
  const route = useTripStore((s) => s.route);
  const highlights = useTripStore((s) => s.highlights);
  const distance = useTripStore((s) => s.distance);
  const elevationGain = useTripStore((s) => s.elevationGain);
  const startTrip = useTripStore((s) => s.startTrip);
  const pauseTrip = useTripStore((s) => s.pauseTrip);
  const resumeTrip = useTripStore((s) => s.resumeTrip);
  const endTrip = useTripStore((s) => s.endTrip);
  const addHighlight = useTripStore((s) => s.addHighlight);
  const resetTrip = useTripStore((s) => s.resetTrip);
  const startNewTrip = useTripStore((s) => s.startNewTrip);

  const durationMs = useTripStore((s) => getTripDurationMs(s));

  useEffect(() => {
    if (!isTracking) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [isTracking]);

  const showStats =
    isTracking || route.length > 0 || distance > 0 || elevationGain > 0;
  const showEndedActions = tripStatus === "ended";

  const handleEndTrip = useCallback(() => {
    if (window.confirm("Do you want to end trip?")) {
      endTrip();
    }
  }, [endTrip]);

  const downloadPng = useCallback((dataUrl: string, filename: string) => {
    const link = document.createElement("a");
    link.download = filename;
    link.href = dataUrl;
    link.click();
  }, []);

  const handleExportPng = useCallback(async () => {
    if (!shareCardRef.current) return;
    setExportStatus("busy");
    try {
      const dataUrl = await captureShareCardAsPng(shareCardRef.current);
      downloadPng(dataUrl, `road-strava-trip-${Date.now()}.png`);
      setExportStatus("idle");
    } catch {
      setExportStatus("error");
    }
  }, [downloadPng]);

  const handleShare = useCallback(async () => {
    if (!shareCardRef.current || typeof navigator === "undefined") return;
    setExportStatus("busy");
    try {
      const dataUrl = await captureShareCardAsPng(shareCardRef.current);
      const filename = `road-strava-trip-${Date.now()}.png`;
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], filename, { type: "image/png" });

      const sharePayload: ShareData = {
        title: "Road Strava trip",
        text: "My road trip story card",
        files: [file],
      };

      const canShareFiles =
        typeof navigator.share === "function" &&
        (!navigator.canShare || navigator.canShare(sharePayload));

      if (canShareFiles) {
        try {
          await navigator.share(sharePayload);
          setExportStatus("idle");
          return;
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") {
            setExportStatus("idle");
            return;
          }
        }
      }

      downloadPng(dataUrl, filename);
      setExportStatus("idle");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setExportStatus("idle");
        return;
      }
      setExportStatus("error");
    }
  }, [downloadPng]);

  return (
    <section className="flex h-full min-h-0 flex-col">
      <header className="shrink-0 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <h1 className="text-lg font-semibold">Road Trip Tracker</h1>
        {persistHydrated && showStats ? (
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

      <div className="relative min-h-0 flex-1">
        <TripMapDynamic />
      </div>

      <div className="grid shrink-0 grid-cols-1 gap-2 border-t border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
        {!persistHydrated ? (
          <p className="py-3 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Loading trip…
          </p>
        ) : null}
        {persistHydrated && tripStatus === "idle" ? (
          <button
            type="button"
            onClick={startTrip}
            className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500"
          >
            Start Trip
          </button>
        ) : null}

        {persistHydrated && tripStatus === "tracking" ? (
          <>
            <button
              type="button"
              onClick={pauseTrip}
              className="rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-400"
            >
              Pause
            </button>
            <button
              type="button"
              onClick={addHighlight}
              className="rounded-xl border border-indigo-300 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-300 dark:hover:bg-indigo-900/30"
            >
              Highlight Location
            </button>
            <button
              type="button"
              onClick={handleEndTrip}
              className="rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-500"
            >
              Stop Trip
            </button>
          </>
        ) : null}

        {persistHydrated && tripStatus === "paused" ? (
          <>
            <button
              type="button"
              onClick={resumeTrip}
              className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500"
            >
              Unpause
            </button>
            <button
              type="button"
              onClick={addHighlight}
              className="rounded-xl border border-indigo-300 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-300 dark:hover:bg-indigo-900/30"
            >
              Highlight Location
            </button>
            <button
              type="button"
              onClick={handleEndTrip}
              className="rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-500"
            >
              End Trip
            </button>
          </>
        ) : null}

        {persistHydrated && showEndedActions ? (
          <>
            <button
              type="button"
              onClick={handleExportPng}
              disabled={exportStatus === "busy"}
              className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
            >
              {exportStatus === "busy" ? "Exporting…" : "Export story PNG"}
            </button>
            <button
              type="button"
              onClick={handleShare}
              disabled={exportStatus === "busy"}
              className="rounded-xl border border-emerald-300 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-60 dark:border-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
            >
              {exportStatus === "busy" ? "Sharing…" : "Share"}
            </button>
            {exportStatus === "error" ? (
              <p className="text-center text-xs text-red-500">
                Could not export. Wait for the map to load and try again.
              </p>
            ) : null}
            <button
              type="button"
              onClick={startNewTrip}
              className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500"
            >
              Start new trip
            </button>
            <button
              type="button"
              onClick={resetTrip}
              className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Clear trip
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
          highlights={highlights}
        />
      </div>
    </section>
  );
}
