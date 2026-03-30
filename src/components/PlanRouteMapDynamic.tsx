"use client";

import dynamic from "next/dynamic";

import type { PlanRouteMapProps } from "@/src/components/PlanRouteMap";

const PlanRouteMap = dynamic(() => import("@/src/components/PlanRouteMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[min(280px,42dvh)] w-full shrink-0 items-center justify-center rounded-2xl border border-zinc-700/50 bg-zinc-900/80 text-sm text-zinc-400 sm:h-[300px]">
      Loading map…
    </div>
  ),
});

export default function PlanRouteMapDynamic(props: PlanRouteMapProps) {
  return <PlanRouteMap {...props} />;
}
