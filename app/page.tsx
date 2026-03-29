import dynamic from "next/dynamic";

const TripMap = dynamic(() => import("@/src/components/TripMap"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 flex items-center justify-center bg-zinc-100 text-zinc-600 dark:bg-zinc-950 dark:text-zinc-400">
      Loading map…
    </div>
  ),
});

export default function Home() {
  return <TripMap />;
}
