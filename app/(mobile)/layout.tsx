import MobileAppShell from "@/src/components/MobileAppShell";

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MobileAppShell>{children}</MobileAppShell>;
}
