"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  computeSceneryScore,
  fetchOsrmRoute,
  formatDuration,
  metersToMiles,
  searchPhoton,
  wrigglinessRatio,
  type PhotonFeature,
} from "@/src/lib/plannerApi";

function featureLabel(f: PhotonFeature): string {
  const p = f.properties;
  const parts = [p.name, p.street, p.city, p.state, p.country].filter(
    Boolean
  );
  return parts.length > 0 ? parts.join(", ") : "Unknown place";
}

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function PlanPage() {
  const [startQ, setStartQ] = useState("");
  const [endQ, setEndQ] = useState("");
  const debouncedStart = useDebouncedValue(startQ, 350);
  const debouncedEnd = useDebouncedValue(endQ, 350);

  const [startResults, setStartResults] = useState<PhotonFeature[]>([]);
  const [endResults, setEndResults] = useState<PhotonFeature[]>([]);
  const [startPick, setStartPick] = useState<PhotonFeature | null>(null);
  const [endPick, setEndPick] = useState<PhotonFeature | null>(null);

  const [startSearchLoading, setStartSearchLoading] = useState(false);
  const [endSearchLoading, setEndSearchLoading] = useState(false);
  const [routing, setRouting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [miles, setMiles] = useState<number | null>(null);
  const [eta, setEta] = useState<string | null>(null);
  const [sceneryScore, setSceneryScore] = useState<number | null>(null);
  const [wriggliness, setWriggliness] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (debouncedStart.length < 2) {
      setStartResults([]);
      return;
    }
    setStartSearchLoading(true);
    searchPhoton(debouncedStart)
      .then((features) => {
        if (!cancelled) setStartResults(features);
      })
      .catch(() => {
        if (!cancelled) setStartResults([]);
      })
      .finally(() => {
        if (!cancelled) setStartSearchLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedStart]);

  useEffect(() => {
    let cancelled = false;
    if (debouncedEnd.length < 2) {
      setEndResults([]);
      return;
    }
    setEndSearchLoading(true);
    searchPhoton(debouncedEnd)
      .then((features) => {
        if (!cancelled) setEndResults(features);
      })
      .catch(() => {
        if (!cancelled) setEndResults([]);
      })
      .finally(() => {
        if (!cancelled) setEndSearchLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedEnd]);

  const startCoord = useMemo((): [number, number] | null => {
    if (!startPick) return null;
    return startPick.geometry.coordinates;
  }, [startPick]);

  const endCoord = useMemo((): [number, number] | null => {
    if (!endPick) return null;
    return endPick.geometry.coordinates;
  }, [endPick]);

  const handlePlanRoute = useCallback(async () => {
    if (!startCoord || !endCoord) {
      setError("Choose both start and end from the suggestions.");
      return;
    }
    setError(null);
    setRouting(true);
    setMiles(null);
    setEta(null);
    setSceneryScore(null);
    setWriggliness(null);
    try {
      const route = await fetchOsrmRoute(startCoord, endCoord);
      const mi = metersToMiles(route.distanceM);
      const w = wrigglinessRatio(route.distanceM, startCoord, endCoord);
      const score = computeSceneryScore(w);
      setMiles(mi);
      setEta(formatDuration(route.durationS));
      setWriggliness(w);
      setSceneryScore(score);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load route.");
    } finally {
      setRouting(false);
    }
  }, [startCoord, endCoord]);

  return (
    <section className="flex h-full flex-col gap-4 p-4">
      <header>
        <h1 className="text-lg font-semibold">Trip Planner</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Search start and end (Photon), then route with OSRM.
        </p>
      </header>

      <div className="space-y-4 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
        <div className="relative">
          <label className="block text-sm font-medium">
            Start
            <input
              type="text"
              value={startQ}
              onChange={(e) => {
                setStartQ(e.target.value);
                setStartPick(null);
              }}
              placeholder="Search place…"
              autoComplete="off"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          {startPick ? (
            <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
              ✓ {featureLabel(startPick)}
            </p>
          ) : null}
          {startResults.length > 0 && !startPick ? (
            <ul className="absolute z-20 mt-1 max-h-40 w-full overflow-auto rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
              {startResults.map((f, i) => (
                <li key={`s-${i}`}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    onClick={() => {
                      setStartPick(f);
                      setStartQ(featureLabel(f));
                      setStartResults([]);
                    }}
                  >
                    {featureLabel(f)}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {loadingSearch === "start" && debouncedStart.length >= 2 ? (
            <p className="mt-1 text-xs text-zinc-500">Searching…</p>
          ) : null}
        </div>

        <div className="relative" ref={endRef}>
          <label className="block text-sm font-medium">
            End
            <input
              type="text"
              value={endQ}
              onChange={(e) => {
                setEndQ(e.target.value);
                setEndPick(null);
              }}
              placeholder="Search place…"
              autoComplete="off"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          {endPick ? (
            <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
              ✓ {featureLabel(endPick)}
            </p>
          ) : null}
          {endResults.length > 0 && !endPick ? (
            <ul className="absolute z-20 mt-1 max-h-40 w-full overflow-auto rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
              {endResults.map((f, i) => (
                <li key={`e-${i}`}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    onClick={() => {
                      setEndPick(f);
                      setEndQ(featureLabel(f));
                      setEndResults([]);
                    }}
                  >
                    {featureLabel(f)}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {endSearchLoading && debouncedEnd.length >= 2 ? (
            <p className="mt-1 text-xs text-zinc-500">Searching…</p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={handlePlanRoute}
          disabled={routing || !startPick || !endPick}
          className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {routing ? "Routing…" : "Plan route"}
        </button>
        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : null}
      </div>

      {miles != null && eta != null && sceneryScore != null ? (
        <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-4 shadow-sm dark:border-indigo-900 dark:from-indigo-950 dark:to-zinc-900">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-indigo-800 dark:text-indigo-200">
            Route card
          </h2>
          <dl className="mt-3 grid gap-3">
            <div className="flex justify-between border-b border-indigo-100 pb-2 dark:border-indigo-900">
              <dt className="text-sm text-zinc-600 dark:text-zinc-400">
                Total miles
              </dt>
              <dd className="text-lg font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
                {miles.toFixed(1)} mi
              </dd>
            </div>
            <div className="flex justify-between border-b border-indigo-100 pb-2 dark:border-indigo-900">
              <dt className="text-sm text-zinc-600 dark:text-zinc-400">
                Estimated time
              </dt>
              <dd className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {eta}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-zinc-600 dark:text-zinc-400">
                Scenery score
              </dt>
              <dd className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {sceneryScore}{" "}
                <span className="text-sm font-normal text-zinc-500">
                  / 100
                </span>
              </dd>
            </div>
          </dl>
          {wriggliness != null ? (
            <p className="mt-3 text-xs text-zinc-500">
              Wriggliness {wriggliness.toFixed(2)}
              {wriggliness > 1.3
                ? " — curvier than a straight line (scenic road feel)."
                : " — relatively direct."}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
