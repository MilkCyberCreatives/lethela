import type { ReactNode } from "react";
import { buildNoIndexMetadata } from "@/lib/seo";

export const metadata = buildNoIndexMetadata({
  title: "Rider Console",
  description: "Private Lethela rider console for a delivery order reference.",
});

export default function RiderConsoleLayout({ children }: { children: ReactNode }) {
  return children;
}
