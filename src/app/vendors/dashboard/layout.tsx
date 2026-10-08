import type { ReactNode } from "react";

// Server-rendered theme marker so the light dashboard styles apply on first paint, before
// the client-side route marker runs.
export default function VendorDashboardLayout({ children }: { children: ReactNode }) {
  return <div data-lethela-dashboard="vendor">{children}</div>;
}
