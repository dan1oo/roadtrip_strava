"use client";

import TripMapDynamic from "@/src/components/TripMapDynamic";
import { useTripStore } from "@/src/store/useTripStore";

export default function TripPage() {
  const isTracking = useTripStore((s) => s.isTracking);
  const route = useTripStore((s) => s.route);
  const distance = useTripStore((s) => s.distance);
  const toggleTracking = useTripStore((s) => s.toggleTracking);
  const resetTrip = useTripStore((s) => s.resetTrip);

  return (
    <section className="flex h-full flex-col">
      <header className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <h1 className="text-lg font-semibold">Road Trip Tracker</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          {route.length} points logged · {distance.toFixed(2)} miles
        </p>
      </header>

      <div className="relative flex-1">
        <TripMapDynamic />
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-zinc-200 p-3 dark:border-zinc-800">
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

        <button
          type="button"
          disabled={route.length === 0 || isTracking}
          className="rounded-xl border border-zinc-300 px-4 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Export (Soon)
        </button>

        <button
          type="button"
          onClick={resetTrip}
          disabled={isTracking || route.length === 0}
          className="col-span-2 rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Reset Trip
        </button>
      </div>
    </section>
  );
}
