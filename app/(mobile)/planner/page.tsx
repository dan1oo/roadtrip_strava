"use client";

export default function PlannerPage() {
  return (
    <section className="flex h-full flex-col gap-4 p-4">
      <header>
        <h1 className="text-lg font-semibold">Trip Planner</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Choose your start and end points to get route ideas and recommendations.
        </p>
      </header>

      <div className="space-y-3 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
        <label className="block text-sm font-medium">
          Start
          <input
            type="text"
            placeholder="City or address"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>

        <label className="block text-sm font-medium">
          End
          <input
            type="text"
            placeholder="City or address"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>

        <button
          type="button"
          className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
        >
          Get Recommendations
        </button>
      </div>

      <div className="rounded-2xl border border-dashed border-zinc-300 p-4 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
        Recommendations will appear here in a future step (stops, scenic routes,
        food, and lodging).
      </div>
    </section>
  );
}
