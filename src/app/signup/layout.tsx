import type { ReactNode } from "react";
import { buildNoIndexMetadata } from "@/lib/seo";

export const metadata = buildNoIndexMetadata({
  title: "Create Account",
  description: "Create a Lethela account for customer, vendor, or rider access.",
  path: "/signup",
});

export default function SignUpLayout({ children }: { children: ReactNode }) {
  return children;
}
