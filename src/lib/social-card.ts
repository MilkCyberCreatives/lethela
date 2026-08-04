import { absoluteUrl } from "@/lib/site";

export function buildSocialCardUrl(title: string, description: string) {
  const params = new URLSearchParams({
    title: title.trim().slice(0, 92),
    description: description.trim().slice(0, 190),
  });
  return absoluteUrl(`/social-card?${params.toString()}`);
}
