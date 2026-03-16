import { permanentRedirect } from "next/navigation";

type Props = { params: Promise<{ slug: string }> };

export default async function RestaurantPage({ params }: Props) {
  const { slug } = await params;
  permanentRedirect(`/vendors/${encodeURIComponent(slug)}`);
}
