import { create } from "zustand";

export type LngLat = [number, number];

const EARTH_RADIUS_MILES = 3958.8;

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
  route: LngLat[];
  distance: number;
  toggleTracking: () => void;
  resetTrip: () => void;
  addPoint: (lng: number, lat: number) => void;
};

export const useTripStore = create<TripState>((set) => ({
  isTracking: false,
  route: [],
  distance: 0,
  toggleTracking: () => {
    set((state) => ({ isTracking: !state.isTracking }));
  },
  resetTrip: () => {
    set({ isTracking: false, route: [], distance: 0 });
  },
  addPoint: (lng, lat) => {
    const point: LngLat = [lng, lat];
    set((state) => {
      const last = state.route[state.route.length - 1];
      const delta = last ? haversineMiles(last, point) : 0;
      return {
        route: [...state.route, point],
        distance: state.distance + delta,
      };
    });
  },
}));
