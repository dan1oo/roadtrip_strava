"use client";

import { useMemo } from "react";

import { useTripStore, type PastTrip } from "@/src/store/useTripStore";

function formatDurationClock(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function formatEndedAt(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function PastTripCard({ trip }: { trip: PastTrip }) {
  return (
    <li className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {formatEndedAt(trip.endedAt)}
      </p>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Time
          </dt>
          <dd className="text-sm font-bold tabular-nums">{formatDurationClock(trip.durationMs)}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Distance
          </dt>
          <dd className="text-sm font-bold tabular-nums">{trip.distance.toFixed(2)} mi</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Elevation
          </dt>
          <dd className="text-sm font-bold tabular-nums">
            {Math.round(trip.elevationGain).toLocaleString()} ft
          </dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
        {trip.route.length.toLocaleString()} GPS points, {trip.highlights.length} highlights
      </p>
    </li>
  );
}

export default function PastTripsPage() {
  const pastTrips = useTripStore((s) => s.pastTrips);
  const clearPastTrips = useTripStore((s) => s.clearPastTrips);

  const hasTrips = useMemo(() => pastTrips.length > 0, [pastTrips.length]);

  return (
    <section className="flex h-full min-h-0 flex-col">
      <header className="shrink-0 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <h1 className="text-lg font-semibold">Past Trips</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
          Saved trips from when you ended recording.
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {hasTrips ? (
          <>
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Clear all saved past trips?")) clearPastTrips();
                }}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Clear history
              </button>
            </div>
            <ul className="space-y-3">
              {pastTrips.map((trip) => (
                <PastTripCard key={trip.id} trip={trip} />
              ))}
            </ul>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            No past trips yet. End a recorded trip to save it here.
          </div>
        )}
      </div>
    </section>
  );
}
