"use client";

import { useEffect, useRef, useState } from "react";

import { drawRasterRouteMap } from "@/src/lib/shareMapRaster";
import type { LngLat } from "@/src/store/useTripStore";

/** Internal resolution for crisp PNG export (html-to-image uses pixelRatio 2). */
const CANVAS_W = 560;
const CANVAS_H = 340;

type Props = {
  route: LngLat[];
  highlights: LngLat[];
};

export default function ShareRouteMapCanvas({ route, highlights }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    setReady(false);

    void (async () => {
      await drawRasterRouteMap(
        canvas,
        route,
        highlights,
        CANVAS_W,
        CANVAS_H
      );
      if (!cancelled) setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [route, highlights]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      data-share-map-ready={ready ? "true" : "false"}
      className="block h-auto w-full rounded-xl"
    />
  );
}
