import type { Metadata } from "next";
import { buildSocialCardUrl } from "@/lib/social-card";
import { SITE_NAME, absoluteUrl } from "@/lib/site";

type BuildMetadataInput = {
  title: string;
  description: string;
  path?: string;
  image?: string;
  noIndex?: boolean;
};

export function buildPageMetadata({
  title,
  description,
  path,
  image,
  noIndex = false,
}: BuildMetadataInput): Metadata {
  const canonical = path ? (path.startsWith("/") ? path : `/${path}`) : undefined;
  const fullTitle = title === SITE_NAME ? SITE_NAME : `${title} | ${SITE_NAME}`;
  const brandedImage = {
    url: buildSocialCardUrl(fullTitle, description),
    width: 1200,
    height: 630,
    alt: `${title} on ${SITE_NAME}`,
    type: "image/png",
  };
  const contentImage = image
    ? {
        url: absoluteUrl(image),
        alt: title,
      }
    : null;

  return {
    title,
    description,
    alternates: canonical ? { canonical } : undefined,
    robots: noIndex
      ? {
          index: false,
          follow: false,
          nocache: true,
          googleBot: {
            index: false,
            follow: false,
            "max-image-preview": "none",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        },
    openGraph: noIndex
      ? undefined
      : {
          type: "website",
          siteName: SITE_NAME,
          locale: "en_ZA",
          title: fullTitle,
          description,
          url: canonical ? absoluteUrl(canonical) : undefined,
          images: [brandedImage, ...(contentImage ? [contentImage] : [])],
        },
    twitter: noIndex
      ? undefined
      : {
          card: "summary_large_image",
          title: fullTitle,
          description,
          images: [brandedImage.url, ...(contentImage ? [contentImage.url] : [])],
        },
  };
}

export function buildNoIndexMetadata(input: Omit<BuildMetadataInput, "noIndex">): Metadata {
  return buildPageMetadata({ ...input, noIndex: true });
}
