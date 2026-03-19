import type { Metadata } from "next";
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
  image = "/hero.jpg",
  noIndex = false,
}: BuildMetadataInput): Metadata {
  const canonical = path ? (path.startsWith("/") ? path : `/${path}`) : undefined;
  const fullTitle = title === SITE_NAME ? SITE_NAME : `${title} | ${SITE_NAME}`;

  return {
    title,
    description,
    alternates: canonical
      ? {
          canonical,
        }
      : undefined,
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
        },
    openGraph: noIndex
      ? undefined
      : {
          type: "website",
          title: fullTitle,
          description,
          url: canonical ? absoluteUrl(canonical) : undefined,
          images: [absoluteUrl(image)],
        },
    twitter: noIndex
      ? undefined
      : {
          card: "summary_large_image",
          title: fullTitle,
          description,
          images: [absoluteUrl(image)],
        },
  };
}

export function buildNoIndexMetadata(input: Omit<BuildMetadataInput, "noIndex">): Metadata {
  return buildPageMetadata({ ...input, noIndex: true });
}
