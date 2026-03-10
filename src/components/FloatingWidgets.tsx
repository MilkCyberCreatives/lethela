"use client";

import dynamic from "next/dynamic";

const FloatingWhatsApp = dynamic(() => import("@/components/FloatingWhatsApp"), { ssr: false });
const AIChatWidget = dynamic(() => import("@/components/AIChatWidget"), { ssr: false });

export default function FloatingWidgets() {
  return (
    <>
      <FloatingWhatsApp />
      <AIChatWidget />
    </>
  );
}
