const OPEN_ELEVATION_ENDPOINT = "https://api.open-elevation.com/api/v1/lookup";

type ElevationApiResponse = {
  results?: Array<{ elevation?: number }>;
};

/**
 * Fetch elevation (meters) for a [lat,lng] from Open-Elevation.
 * Returns null on failures so trip tracking never blocks.
 */
export async function fetchElevationMeters(
  lat: number,
  lng: number
): Promise<number | null> {
  const url = `${OPEN_ELEVATION_ENDPOINT}?locations=${lat},${lng}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data: ElevationApiResponse = await res.json();
    const elevation = data.results?.[0]?.elevation;
    return typeof elevation === "number" && Number.isFinite(elevation)
      ? elevation
      : null;
  } catch {
    return null;
  }
}
