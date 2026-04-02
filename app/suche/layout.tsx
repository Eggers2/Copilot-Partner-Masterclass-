import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Copilot-Berater finden | copilotberater.de",
  robots: { index: false, follow: false },
};

export default function SucheLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
