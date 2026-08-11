import { ImageResponse } from "next/og";
import { SITE_DESCRIPTION } from "@/lib/site";

export const BRAND_SOCIAL_IMAGE_SIZE = {
  width: 1200,
  height: 630,
};

type BrandSocialImageInput = {
  title?: string;
  description?: string;
};

export function createBrandSocialImage({
  title = "Lethela — Siyashesha",
  description = SITE_DESCRIPTION,
}: BrandSocialImageInput = {}) {
  const safeTitle = title.trim().slice(0, 92) || "Lethela — Siyashesha";
  const safeDescription = description.trim().slice(0, 190) || SITE_DESCRIPTION;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background: "#080B27",
          color: "#ffffff",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -180,
            right: -120,
            width: 520,
            height: 520,
            borderRadius: 520,
            background: "#B5001B",
            opacity: 0.2,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -250,
            left: -100,
            width: 620,
            height: 620,
            borderRadius: 620,
            border: "70px solid rgba(181, 0, 27, 0.18)",
          }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            padding: "62px 72px 54px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div
              style={{
                width: 96,
                height: 96,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 24,
                background: "#B5001B",
                color: "#ffffff",
                fontSize: 64,
                fontWeight: 900,
                lineHeight: 1,
              }}
            >
              L
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 62, fontWeight: 900, letterSpacing: -2 }}>Lethela</div>
              <div
                style={{
                  marginTop: 4,
                  color: "#F03A51",
                  fontSize: 23,
                  fontWeight: 800,
                  letterSpacing: 8,
                }}
              >
                SIYASHESHA
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", maxWidth: 1000 }}>
            <div style={{ fontSize: 54, lineHeight: 1.08, fontWeight: 800, letterSpacing: -1.2 }}>
              {safeTitle}
            </div>
            <div
              style={{
                marginTop: 22,
                maxWidth: 920,
                color: "rgba(255,255,255,0.78)",
                fontSize: 25,
                lineHeight: 1.35,
              }}
            >
              {safeDescription}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderTop: "1px solid rgba(255,255,255,0.18)",
              paddingTop: 24,
              color: "rgba(255,255,255,0.72)",
              fontSize: 21,
            }}
          >
            <span>Township delivery • South Africa</span>
            <span>www.lethela.co.za</span>
          </div>
        </div>
      </div>
    ),
    BRAND_SOCIAL_IMAGE_SIZE,
  );
}
