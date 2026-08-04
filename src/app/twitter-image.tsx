import { createBrandSocialImage, BRAND_SOCIAL_IMAGE_SIZE } from "@/lib/brand-image";
import { SITE_DESCRIPTION } from "@/lib/site";

export const alt = "Lethela — Siyashesha township delivery platform";
export const size = BRAND_SOCIAL_IMAGE_SIZE;
export const contentType = "image/png";

export default function TwitterImage() {
  return createBrandSocialImage({
    title: "Fast township delivery, built for South Africa",
    description: SITE_DESCRIPTION,
  });
}
