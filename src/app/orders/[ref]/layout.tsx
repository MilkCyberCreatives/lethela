import type { ReactNode } from "react";
import { buildNoIndexMetadata } from "@/lib/seo";

export const metadata = buildNoIndexMetadata({
  title: "Order Tracking",
  description: "Private Lethela order tracking page for a specific order reference.",
});

export default function OrderTrackingLayout({ children }: { children: ReactNode }) {
  return children;
}
