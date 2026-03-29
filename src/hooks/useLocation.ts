"use client";

import { useEffect } from "react";

import { fetchElevationMeters } from "@/src/lib/elevation";
import { useTripStore } from "@/src/store/useTripStore";

export function useLocation(): void {
  const isTracking = useTripStore((s) => s.isTracking);
  const addPoint = useTripStore((s) => s.addPoint);
  const setLiveUserPosition = useTripStore((s) => s.setLiveUserPosition);

  useEffect(() => {
    if (typeof navigator === "undefined") return;

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { longitude, latitude, altitude } = position.coords;
        setLiveUserPosition([longitude, latitude]);
        if (!isTracking) return;
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
      setLiveUserPosition(null);
    };
  }, [isTracking, addPoint, setLiveUserPosition]);
}
