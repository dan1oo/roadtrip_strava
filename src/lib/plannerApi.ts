import { haversineMeters } from "@/src/lib/geo";

const PHOTON_BASE = "https://photon.komoot.io/api/";
const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";

export type PhotonFeature = {
  geometry: { type: string; coordinates: [number, number] };
  properties: {
    name?: string;
    street?: string;
    city?: string;
    country?: string;
    state?: string;
  };
};

export type PhotonResponse = {
  features: PhotonFeature[];
};

export async function searchPhoton(q: string): Promise<PhotonFeature[]> {
  const trimmed = q.trim();
  if (trimmed.length < 2) return [];
  const url = `${PHOTON_BASE}?q=${encodeURIComponent(trimmed)}&limit=6`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Search failed");
  const data: PhotonResponse = await res.json();
  return data.features ?? [];
}

export type OsrmRouteResult = {
  distanceM: number;
  durationS: number;
  geometry: { type: "LineString"; coordinates: [number, number][] };
};

export async function fetchOsrmRoute(
  source: [number, number],
  dest: [number, number]
): Promise<OsrmRouteResult> {
  const [sLng, sLat] = source;
  const [dLng, dLat] = dest;
  const path = `${sLng},${sLat};${dLng},${dLat}`;
  const url = `${OSRM_BASE}/${path}?overview=full&geometries=geojson`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Routing failed");
  const data = await res.json();
  if (data.code !== "Ok" || !data.routes?.[0]) {
    throw new Error(data.message ?? "No route found");
  }
  const route = data.routes[0];
  return {
    distanceM: route.distance,
    durationS: route.duration,
    geometry: route.geometry,
  };
}

/** Route path length / straight-line (start–end); both in meters. */
export function wrigglinessRatio(routeDistanceM: number, start: [number, number], end: [number, number]): number {
  const straight = haversineMeters(start, end);
  if (straight < 1) return 1;
  return routeDistanceM / straight;
}

/**
 * Scenery score from OSRM route vs straight line + random “elevation” jitter.
 * Curvy routes (wriggliness > ~1.3) read as more scenic per product note.
 */
export function computeSceneryScore(wriggliness: number): number {
  const elevationFactor = Math.random() * 15;
  const raw = wriggliness * 50 + elevationFactor;
  return Math.min(100, Math.round(raw));
}

export function formatDuration(seconds: number): string {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

export function metersToMiles(m: number): number {
  return m / 1609.344;
}
