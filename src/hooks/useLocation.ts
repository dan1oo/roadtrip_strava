"use client";

import { useEffect } from "react";

import { useTripStore } from "@/src/store/useTripStore";

export function useLocation(): void {
  const isTracking = useTripStore((s) => s.isTracking);
  const addPoint = useTripStore((s) => s.addPoint);

  useEffect(() => {
    if (!isTracking || typeof navigator === "undefined") return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { longitude, latitude, altitude } = position.coords;
        addPoint(longitude, latitude, altitude ?? null);
      },
      undefined,
      { enableHighAccuracy: true }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [isTracking, addPoint]);
}
