export type PlanRouteHighlightKind = "place" | "scenic" | "attraction";

export type PlanRouteHighlight = {
  id: string;
  label: string;
  lng: number;
  lat: number;
  kind: PlanRouteHighlightKind;
  /** Short hint for cards, e.g. "Town" / "Viewpoint" */
  subtitle?: string;
};

export type PlanHighlightsResponse = {
  highlights: PlanRouteHighlight[];
};

export async function fetchPlanHighlights(
  routeCoordinates: [number, number][]
): Promise<PlanRouteHighlight[]> {
  if (routeCoordinates.length < 2) return [];
  const res = await fetch("/api/plan-highlights", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ coordinates: routeCoordinates }),
  });
  if (!res.ok) return [];
  const data: PlanHighlightsResponse = await res.json();
  return data.highlights ?? [];
}
