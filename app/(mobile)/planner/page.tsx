import { redirect } from "next/navigation";

/** Legacy URL; planner lives at `/plan`. */
export default function PlannerRedirectPage() {
  redirect("/plan");
}
