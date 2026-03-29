import { haversineMeters } from "@/src/lib/geo";

/** Evenly spaced points by distance along a [lng, lat] polyline (linear interp per segment). */
export function sampleAlongLineString(
  coordinates: [number, number][],
  count: number
): [number, number][] {
  if (coordinates.length < 2 || count < 1) return [];
  const segLens: number[] = [];
  let total = 0;
  for (let i = 1; i < coordinates.length; i++) {
    const d = haversineMeters(coordinates[i - 1]!, coordinates[i]!);
    segLens.push(d);
    total += d;
  }
  if (total < 1) return [[...coordinates[0]!]];
  const targets: number[] = [];
  for (let k = 1; k <= count; k++) {
    targets.push((total * k) / (count + 1));
  }
  const out: [number, number][] = [];
  let acc = 0;
  let segIdx = 0;
  let tIdx = 0;
  while (tIdx < targets.length && segIdx < segLens.length) {
    const nextAcc = acc + segLens[segIdx]!;
    while (tIdx < targets.length && targets[tIdx]! <= nextAcc) {
      const alongSeg = targets[tIdx]! - acc;
      const t = alongSeg / segLens[segIdx]!;
      const [lng0, lat0] = coordinates[segIdx]!;
      const [lng1, lat1] = coordinates[segIdx + 1]!;
      out.push([lng0 + t * (lng1 - lng0), lat0 + t * (lat1 - lat0)]);
      tIdx++;
    }
    acc = nextAcc;
    segIdx++;
  }
  return out;
}

/** Reduce vertex count for long OSRM paths before distance math. */
export function decimateCoordinates(
  coordinates: [number, number][],
  maxPoints: number
): [number, number][] {
  if (coordinates.length <= maxPoints) return coordinates;
  const out: [number, number][] = [];
  const step = (coordinates.length - 1) / (maxPoints - 1);
  for (let i = 0; i < maxPoints; i++) {
    out.push([...coordinates[Math.round(i * step)]!] as [number, number]);
  }
  return out;
}

export function boundsFromCoordinates(
  coordinates: [number, number][]
): [[number, number], [number, number]] | null {
  if (coordinates.length === 0) return null;
  let minLng = coordinates[0]![0];
  let maxLng = coordinates[0]![0];
  let minLat = coordinates[0]![1];
  let maxLat = coordinates[0]![1];
  for (const [lng, lat] of coordinates) {
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}
