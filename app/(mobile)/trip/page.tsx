"use client";

import ShareCard from "@/src/components/ShareCard";
import TripMapDynamic from "@/src/components/TripMapDynamic";
import { useTripStore } from "@/src/store/useTripStore";

export default function TripPage() {
  const isTracking = useTripStore((s) => s.isTracking);
  const route = useTripStore((s) => s.route);
  const distance = useTripStore((s) => s.distance);
  const elevationGain = useTripStore((s) => s.elevationGain);
  const toggleTracking = useTripStore((s) => s.toggleTracking);
  const resetTrip = useTripStore((s) => s.resetTrip);

  return (
    <section className="flex h-full flex-col">
      <header className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <h1 className="text-lg font-semibold">Road Trip Tracker</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          {route.length} points · {distance.toFixed(2)} mi ·{" "}
          {Math.round(elevationGain).toLocaleString()} ft gain
        </p>
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
          <button
            type="button"
            onClick={resetTrip}
            className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Reset
          </button>
        ) : null}
      </div>

      <div className="border-t border-zinc-200 px-3 pb-6 pt-4 dark:border-zinc-800">
        <h2 className="mb-3 text-center text-sm font-semibold text-zinc-700 dark:text-zinc-200">
          Share card
        </h2>
        <ShareCard
          distanceMi={distance}
          elevationGainFt={elevationGain}
          route={route}
        />
      </div>
    </section>
  );
}
