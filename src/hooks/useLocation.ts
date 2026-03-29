"use client";

import { useEffect } from "react";

import { fetchElevationMeters } from "@/src/lib/elevation";
import { useTripStore } from "@/src/store/useTripStore";

export function useLocation(): void {
  const isTracking = useTripStore((s) => s.isTracking);
  const addPoint = useTripStore((s) => s.addPoint);

  useEffect(() => {
    if (!isTracking || typeof navigator === "undefined") return;

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { longitude, latitude, altitude } = position.coords;
        const elevationFromApi = await fetchElevationMeters(latitude, longitude);
        addPoint(
          longitude,
          latitude,
          elevationFromApi ?? altitude ?? null
        );
      },
      undefined,
      { enableHighAccuracy: true }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [isTracking, addPoint]);
}
