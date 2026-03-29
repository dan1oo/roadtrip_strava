import dynamic from "next/dynamic";

const TripMap = dynamic(() => import("@/src/components/TripMap"), {
  ssr: false,
});

export default function Home() {
  return <TripMap />;
}
