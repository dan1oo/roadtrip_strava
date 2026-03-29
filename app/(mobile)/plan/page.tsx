"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import PlanRouteMapDynamic from "@/src/components/PlanRouteMapDynamic";
import {
  computeSceneryScore,
  fetchOsrmRoute,
  formatDuration,
  metersToMiles,
  searchPhoton,
  wrigglinessRatio,
  type PhotonFeature,
} from "@/src/lib/plannerApi";
import {
  fetchPlanHighlights,
  type PlanRouteHighlight,
} from "@/src/lib/plannerHighlights";

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

function highlightBadgeClass(kind: PlanRouteHighlight["kind"]): string {
  switch (kind) {
    case "scenic":
      return "bg-emerald-500/15 text-emerald-700 ring-emerald-500/30 dark:text-emerald-300";
    case "attraction":
      return "bg-violet-500/15 text-violet-700 ring-violet-500/30 dark:text-violet-300";
    case "place":
      return "bg-sky-500/15 text-sky-800 ring-sky-500/30 dark:text-sky-200";
    default:
      return "bg-zinc-500/15 text-zinc-700 ring-zinc-500/30";
  }
}

function kindLabel(kind: PlanRouteHighlight["kind"]): string {
  switch (kind) {
    case "scenic":
      return "Scenery";
    case "attraction":
      return "Attraction";
    case "place":
      return "City / town";
    default:
      return kind;
  }
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
  const [routeCoords, setRouteCoords] = useState<[number, number][] | null>(
    null
  );
  const [highlights, setHighlights] = useState<PlanRouteHighlight[]>([]);
  const [highlightsLoading, setHighlightsLoading] = useState(false);

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
    setRouteCoords(null);
    setHighlights([]);
    setHighlightsLoading(false);
    try {
      const route = await fetchOsrmRoute(startCoord, endCoord);
      const mi = metersToMiles(route.distanceM);
      const w = wrigglinessRatio(route.distanceM, startCoord, endCoord);
      const score = computeSceneryScore(w);
      const coords = route.geometry.coordinates as [number, number][];
      setMiles(mi);
      setEta(formatDuration(route.durationS));
      setWriggliness(w);
      setSceneryScore(score);
      setRouteCoords(coords);

      setHighlightsLoading(true);
      fetchPlanHighlights(coords)
        .then((h) => setHighlights(h))
        .catch(() => setHighlights([]))
        .finally(() => setHighlightsLoading(false));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load route.");
    } finally {
      setRouting(false);
    }
  }, [startCoord, endCoord]);

  const hasRoute = routeCoords != null && routeCoords.length >= 2;

  return (
    <section className="flex h-full flex-col gap-5 overflow-auto p-4 pb-8">
      <header className="shrink-0 space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Trip planner
        </h1>
        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Pick start and end, then explore the driving route on the map with
          cities, scenic spots, and attractions from OpenStreetMap along the
          way.
        </p>
      </header>

      <div className="shrink-0 space-y-4 rounded-2xl border border-zinc-200/80 bg-gradient-to-b from-white to-zinc-50/80 p-4 shadow-sm dark:border-zinc-800 dark:from-zinc-900 dark:to-zinc-950/80">
        <div className="relative">
          <label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200">
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
              className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none ring-0 transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-600 dark:bg-zinc-950 dark:focus:border-indigo-400"
            />
          </label>
          {startPick ? (
            <p className="mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              ✓ {featureLabel(startPick)}
            </p>
          ) : null}
          {startResults.length > 0 && !startPick ? (
            <ul className="absolute z-20 mt-1 max-h-44 w-full overflow-auto rounded-xl border border-zinc-200 bg-white py-1 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
              {startResults.map((f, i) => (
                <li key={`s-${i}`}>
                  <button
                    type="button"
                    className="w-full px-3 py-2.5 text-left text-sm text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
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
          {startSearchLoading && debouncedStart.length >= 2 ? (
            <p className="mt-1 text-xs text-zinc-500">Searching…</p>
          ) : null}
        </div>

        <div className="relative">
          <label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200">
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
              className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-600 dark:bg-zinc-950 dark:focus:border-indigo-400"
            />
          </label>
          {endPick ? (
            <p className="mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              ✓ {featureLabel(endPick)}
            </p>
          ) : null}
          {endResults.length > 0 && !endPick ? (
            <ul className="absolute z-20 mt-1 max-h-44 w-full overflow-auto rounded-xl border border-zinc-200 bg-white py-1 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
              {endResults.map((f, i) => (
                <li key={`e-${i}`}>
                  <button
                    type="button"
                    className="w-full px-3 py-2.5 text-left text-sm text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
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
          className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-sm font-bold text-white shadow-md shadow-indigo-500/25 transition hover:from-indigo-500 hover:to-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {routing ? "Building route…" : "Plan route & show map"}
        </button>
        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : null}
      </div>

      {hasRoute && startCoord && endCoord ? (
        <div className="flex min-h-0 flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Route preview
            </h2>
            {highlightsLoading ? (
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                Finding highlights…
              </span>
            ) : null}
          </div>
          <PlanRouteMapDynamic
            routeCoordinates={routeCoords}
            startCoord={startCoord}
            endCoord={endCoord}
            highlights={highlights}
          />
          <div className="flex flex-wrap gap-2 text-[11px] font-medium">
            <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-emerald-800 ring-1 ring-emerald-500/25 dark:text-emerald-300">
              ● Scenery
            </span>
            <span className="rounded-full bg-violet-500/15 px-2.5 py-1 text-violet-800 ring-1 ring-violet-500/25 dark:text-violet-300">
              ● Attraction
            </span>
            <span className="rounded-full bg-sky-500/15 px-2.5 py-1 text-sky-900 ring-1 ring-sky-500/25 dark:text-sky-200">
              ● City / town
            </span>
          </div>
        </div>
      ) : null}

      {!highlightsLoading && hasRoute && highlights.length === 0 ? (
        <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
          No named highlights returned for this corridor (try a longer or more
          urban route, or check back later — external map APIs can rate-limit).
        </p>
      ) : null}

      {highlights.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Along the way
          </h2>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {highlights.map((h) => (
              <li
                key={h.id}
                className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold leading-snug text-zinc-900 dark:text-zinc-100">
                    {h.label}
                  </p>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${highlightBadgeClass(h.kind)}`}
                  >
                    {kindLabel(h.kind)}
                  </span>
                </div>
                {h.subtitle ? (
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {h.subtitle}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {miles != null && eta != null && sceneryScore != null ? (
        <div className="rounded-2xl border border-indigo-200/90 bg-gradient-to-br from-indigo-50 via-white to-violet-50/80 p-4 shadow-md dark:border-indigo-900/60 dark:from-indigo-950/50 dark:via-zinc-900 dark:to-violet-950/30">
          <h2 className="text-sm font-bold uppercase tracking-wide text-indigo-800 dark:text-indigo-200">
            Trip summary
          </h2>
          <dl className="mt-3 grid gap-3">
            <div className="flex justify-between border-b border-indigo-100 pb-2 dark:border-indigo-900/50">
              <dt className="text-sm text-zinc-600 dark:text-zinc-400">
                Total miles
              </dt>
              <dd className="text-lg font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
                {miles.toFixed(1)} mi
              </dd>
            </div>
            <div className="flex justify-between border-b border-indigo-100 pb-2 dark:border-indigo-900/50">
              <dt className="text-sm text-zinc-600 dark:text-zinc-400">
                Estimated drive time
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
            <p className="mt-3 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              Route wriggliness {wriggliness.toFixed(2)}
              {wriggliness > 1.3
                ? " — more winding than a straight line (often nicer scenery)."
                : " — fairly direct highway-style path."}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
