"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo } from "react";

type DashboardTheme = "admin" | "vendor" | "rider" | "customer";

function resolveDashboardTheme(pathname: string): DashboardTheme | null {
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return "admin";
  if (pathname.startsWith("/vendors/dashboard")) return "vendor";
  if (pathname.startsWith("/rider/dashboard")) return "rider";
  if (pathname === "/account" || pathname.startsWith("/profile")) return "customer";
  return null;
}

export default function RouteThemeMarker() {
  const pathname = usePathname();
  const theme = useMemo(() => resolveDashboardTheme(pathname), [pathname]);

  useEffect(() => {
    const body = document.body;
    if (theme) {
      body.dataset.lethelaDashboard = theme;
    } else {
      delete body.dataset.lethelaDashboard;
    }

    return () => {
      delete body.dataset.lethelaDashboard;
    };
  }, [theme]);

  return null;
}
