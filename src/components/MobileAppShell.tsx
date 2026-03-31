"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useTripStore } from "@/src/store/useTripStore";

type TabItem = {
  href: string;
  label: string;
  icon: string;
};

const tabs: TabItem[] = [
  { href: "/plan", label: "Plan", icon: "PL" },
  { href: "/trip", label: "Track", icon: "TR" },
  { href: "/past", label: "Past", icon: "PA" },
];

export default function MobileAppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const hasUnseenPastTrips = useTripStore((s) => s.hasUnseenPastTrips);

  return (
    <div className="min-h-dvh bg-zinc-200/70 p-3 dark:bg-zinc-950">
      <div className="relative mx-auto h-[95dvh] w-full max-w-sm overflow-hidden rounded-[2rem] border border-zinc-300 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        <main className="h-full min-h-0 overflow-y-auto pb-24">{children}</main>

        <nav className="absolute inset-x-0 bottom-0 border-t border-zinc-200 bg-white/95 px-3 py-2 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95">
          <ul className="grid grid-cols-3 gap-2">
            {tabs.map((tab) => {
              const active = pathname === tab.href;

              return (
                <li key={tab.href}>
                  <Link
                    href={tab.href}
                    className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
                      active
                        ? "bg-blue-600 text-white"
                        : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <span aria-hidden>{tab.icon}</span>
                    <span>{tab.label}</span>
                    {tab.href === "/past" && hasUnseenPastTrips ? (
                      <span
                        aria-label="New saved trip"
                        className="ml-1 inline-block h-2 w-2 rounded-full bg-emerald-500"
                      />
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}
