import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type LngLat = [number, number];

const EARTH_RADIUS_MILES = 3958.8;
const METERS_TO_FEET = 3.28084;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Great-circle distance in miles between two WGS84 points [lng, lat]. */
function haversineMiles(a: LngLat, b: LngLat): number {
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return EARTH_RADIUS_MILES * c;
}

type TripState = {
  isTracking: boolean;
  /** Logged path as [lng, lat][] */
  route: LngLat[];
  /** Total distance in miles */
  distance: number;
  /** Cumulative elevation gain in feet (from GPS altitude when available) */
  elevationGain: number;
  /** Last altitude sample in feet (session; not persisted) */
  lastAltitudeFt: number | null;
  toggleTracking: () => void;
  resetTrip: () => void;
  addPoint: (
    lng: number,
    lat: number,
    altitudeMeters?: number | null
  ) => void;
};

export const useTripStore = create<TripState>()(
  persist(
    (set) => ({
      isTracking: false,
      route: [],
      distance: 0,
      elevationGain: 0,
      lastAltitudeFt: null,
      toggleTracking: () => {
        set((state) => ({ isTracking: !state.isTracking }));
      },
      resetTrip: () => {
        set({
          isTracking: false,
          route: [],
          distance: 0,
          elevationGain: 0,
          lastAltitudeFt: null,
        });
      },
      addPoint: (lng, lat, altitudeMeters) => {
        const point: LngLat = [lng, lat];
        set((state) => {
          const last = state.route[state.route.length - 1];
          const delta = last ? haversineMiles(last, point) : 0;

          let elevationGain = state.elevationGain;
          let lastAltitudeFt = state.lastAltitudeFt;

          if (
            typeof altitudeMeters === "number" &&
            Number.isFinite(altitudeMeters)
          ) {
            const altFt = altitudeMeters * METERS_TO_FEET;
            if (state.lastAltitudeFt != null) {
              const diff = altFt - state.lastAltitudeFt;
              if (diff > 0) elevationGain += diff;
            }
            lastAltitudeFt = altFt;
          }

          return {
            route: [...state.route, point],
            distance: state.distance + delta,
            elevationGain,
            lastAltitudeFt,
          };
        });
      },
    }),
    {
      name: "road-trip-trip",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        route: state.route,
        distance: state.distance,
        isTracking: state.isTracking,
        elevationGain: state.elevationGain,
      }),
    }
  )
);
