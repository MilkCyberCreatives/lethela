import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 38,
          background: "#080B27",
          border: "12px solid #B5001B",
          color: "#ffffff",
          fontFamily: "Arial, Helvetica, sans-serif",
          fontSize: 112,
          fontWeight: 900,
        }}
      >
        L
      </div>
    ),
    size,
  );
}
