import type { ReactNode } from "react";

// Server-rendered theme marker so the light dashboard styles apply on first paint, before
// the client-side route marker runs.
export default function RiderDashboardLayout({ children }: { children: ReactNode }) {
  return <div data-lethela-dashboard="rider">{children}</div>;
}
