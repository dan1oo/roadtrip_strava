import { haversineMeters } from "@/src/lib/geo";
import {
  decimateCoordinates,
  sampleAlongLineString,
} from "@/src/lib/plannerRouteSample";
import type { PlanRouteHighlight } from "@/src/lib/plannerHighlights";
import type { PhotonFeature } from "@/src/lib/plannerApi";

export const runtime = "nodejs";

const PHOTON_REVERSE = "https://photon.komoot.io/reverse";
const OVERPASS = "https://overpass-api.de/api/interpreter";

const PLACE_OSM_VALUES = new Set([
  "city",
  "town",
  "village",
  "hamlet",
  "borough",
  "suburb",
  "quarter",
]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function photonReverse(
  lon: number,
  lat: number
): Promise<PhotonFeature | null> {
  const url = `${PHOTON_REVERSE}?lon=${lon}&lat=${lat}&lang=en`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  const data = (await res.json()) as { features?: PhotonFeature[] };
  return data.features?.[0] ?? null;
}

function capitalizeWord(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function placeHighlightFromPhoton(f: PhotonFeature): PlanRouteHighlight | null {
  const p = f.properties as {
    name?: string;
    city?: string;
    country?: string;
    state?: string;
    osm_key?: string;
    osm_value?: string;
  };
  const osmKey = p.osm_key ?? "";
  const osmValue = (p.osm_value ?? "").toLowerCase();

  if (osmKey === "highway") return null;

  const isPopulatedPlace =
    osmKey === "place" && PLACE_OSM_VALUES.has(osmValue);

  const label =
    p.name && p.city && p.name !== p.city
      ? `${p.name}, ${p.city}`
      : p.city ?? (isPopulatedPlace ? p.name : null) ?? null;

  if (!label) return null;
  if (!isPopulatedPlace && !p.city) return null;

  const [lng, lat] = f.geometry.coordinates;
  const subtitle = isPopulatedPlace
    ? capitalizeWord(osmValue) || "Community"
    : p.city
      ? "City / region"
      : "Place";

  return {
    id: `place-${label.slice(0, 48).replace(/\s+/g, "-").toLowerCase()}-${lng.toFixed(2)}-${lat.toFixed(2)}`,
    label,
    lng,
    lat,
    kind: "place",
    subtitle,
  };
}

function overpassQueryForSamples(samples: [number, number][]): string {
  const lines: string[] = [];
  for (const [lng, lat] of samples) {
    lines.push(`  node["tourism"="viewpoint"](around:22000,${lat},${lng});`);
    lines.push(`  node["natural"="peak"](around:22000,${lat},${lng});`);
    lines.push(`  node["waterway"="waterfall"](around:22000,${lat},${lng});`);
    lines.push(`  node["tourism"="attraction"](around:16000,${lat},${lng});`);
    lines.push(`  node["tourism"="museum"](around:16000,${lat},${lng});`);
    lines.push(`  node["historic"="castle"](around:16000,${lat},${lng});`);
  }
  return `[out:json][timeout:25];
(
${lines.join("\n")}
);
out body 45;`;
}

type OverpassEl = {
  type: string;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
};

function poiFromOverpass(el: OverpassEl): PlanRouteHighlight | null {
  if (el.type !== "node" || el.lat == null || el.lon == null) return null;
  const tags = el.tags ?? {};
  const name = tags.name;
  if (!name) return null;
  const tourism = tags.tourism;
  const natural = tags.natural;
  const historic = tags.historic;
  const waterway = tags.waterway;

  let kind: PlanRouteHighlight["kind"] = "attraction";
  let subtitle = "Point of interest";

  if (tourism === "viewpoint" || natural === "peak" || waterway === "waterfall") {
    kind = "scenic";
    subtitle =
      tourism === "viewpoint"
        ? "Viewpoint"
        : natural === "peak"
          ? "Peak"
          : "Waterfall";
  } else if (tourism === "museum") {
    subtitle = "Museum";
  } else if (tourism === "attraction") {
    subtitle = "Tourist attraction";
  } else if (historic === "castle") {
    subtitle = "Historic site";
  }

  return {
    id: `poi-${el.lat.toFixed(3)}-${el.lon.toFixed(3)}-${name.slice(0, 24)}`,
    label: name,
    lng: el.lon,
    lat: el.lat,
    kind,
    subtitle,
  };
}

function dedupeHighlights(items: PlanRouteHighlight[]): PlanRouteHighlight[] {
  const kept: PlanRouteHighlight[] = [];
  const minSeparationM = 2500;

  outer: for (const h of items) {
    for (const k of kept) {
      if (k.kind !== h.kind) continue;
      const d = haversineMeters([h.lng, h.lat], [k.lng, k.lat]);
      const sameName =
        h.label.toLowerCase().trim() === k.label.toLowerCase().trim();
      if (sameName && d < 8000) continue outer;
      if (d < minSeparationM && h.kind === k.kind && h.kind !== "place")
        continue outer;
    }
    kept.push(h);
  }
  return kept;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      coordinates?: [number, number][];
    };
    const raw = body.coordinates;
    if (!Array.isArray(raw) || raw.length < 2) {
      return Response.json({ highlights: [] as PlanRouteHighlight[] });
    }

    const coords = decimateCoordinates(raw, 1200);
    const samples = sampleAlongLineString(coords, 7);

    const placeItems: PlanRouteHighlight[] = [];
    for (let i = 0; i < samples.length; i++) {
      const [lng, lat] = samples[i]!;
      const f = await photonReverse(lng, lat);
      if (f) {
        const h = placeHighlightFromPhoton(f);
        if (h) placeItems.push(h);
      }
      if (i < samples.length - 1) await sleep(120);
    }

    let poiItems: PlanRouteHighlight[] = [];
    try {
      const overpassSamples = samples.slice(0, 5);
      if (overpassSamples.length > 0) {
        const q = overpassQueryForSamples(overpassSamples);
        const res = await fetch(OVERPASS, {
          method: "POST",
          body: q,
          headers: { "Content-Type": "text/plain;charset=UTF-8" },
          signal: AbortSignal.timeout(22000),
        });
        if (res.ok) {
          const data = (await res.json()) as { elements?: OverpassEl[] };
          for (const el of data.elements ?? []) {
            const h = poiFromOverpass(el);
            if (h) poiItems.push(h);
          }
        }
      }
    } catch {
      poiItems = [];
    }

    const merged = dedupeHighlights([...poiItems, ...placeItems]);
    merged.sort((a, b) => {
      const order = { scenic: 0, attraction: 1, place: 2 };
      return order[a.kind] - order[b.kind];
    });

    return Response.json({ highlights: merged });
  } catch {
    return Response.json({ highlights: [] as PlanRouteHighlight[] });
  }
}
