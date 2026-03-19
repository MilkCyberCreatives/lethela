import type { ReactNode } from "react";
import { buildNoIndexMetadata } from "@/lib/seo";

export const metadata = buildNoIndexMetadata({
  title: "Checkout",
  description: "Review your Lethela cart, delivery fee, and checkout options.",
  path: "/checkout",
});

export default function CheckoutLayout({ children }: { children: ReactNode }) {
  return children;
}
