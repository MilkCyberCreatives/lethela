import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { buildNoIndexMetadata } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export const metadata: Metadata = buildNoIndexMetadata({
  title: "Restaurant Redirect",
  description: "Legacy Lethela restaurant URL redirect.",
});

export default async function RestaurantPage({ params }: Props) {
  const { slug } = await params;
  permanentRedirect(`/vendors/${encodeURIComponent(slug)}`);
}
