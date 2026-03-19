// /src/components/FloatingWhatsApp.tsx
"use client";

import { getOrderWhatsAppPhone } from "@/lib/whatsapp-order";

export default function FloatingWhatsApp() {
  const whatsappHref = `https://wa.me/${getOrderWhatsAppPhone()}`;
  return (
    <a
      href={whatsappHref}
      target="_blank"
      rel="noreferrer"
      aria-label="Message Lethela on WhatsApp"
      className="fixed bottom-5 left-4 z-[80] flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-lethela-primary hover:opacity-95 md:left-auto md:right-5 md:h-14 md:w-14"
    >
      {/* WhatsApp icon — white for contrast */}
      <svg viewBox="0 0 24 24" className="w-7 h-7 text-white" fill="currentColor" aria-hidden>
        <path d="M20.52 3.48A11.87 11.87 0 0 0 12.06 0C5.44.03.1 5.36.12 11.98c0 2.11.56 4.17 1.64 5.98L0 24l6.2-1.7a12.04 12.04 0 0 0 5.86 1.5h.01c6.62 0 12.01-5.37 12.03-12A11.87 11.87 0 0 0 20.52 3.48ZM12.07 22.1h-.01a9.94 9.94 0 0 1-5.06-1.38l-.36-.21-3.68 1 1-3.58-.24-.37A9.93 9.93 0 0 1 2.1 11.97C2.09 6.47 6.56 2 12.06 2h.01A9.94 9.94 0 0 1 22.1 12.03c-.02 5.49-4.49 9.96-10.03 9.96Zm5.46-7.46c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15s-.77.97-.95 1.18c-.18.2-.35.22-.65.07-.3-.15-1.27-.47-2.42-1.49-.9-.8-1.51-1.78-1.69-2.08-.18-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.53.08-.8.38-.27.3-1.05 1.03-1.05 2.5 0 1.46 1.08 2.87 1.24 3.07.15.2 2.12 3.24 5.14 4.55.72.31 1.28.5 1.72.64.72.23 1.38.2 1.9.12.58-.09 1.76-.72 2.01-1.42.25-.7.25-1.3.18-1.42-.07-.12-.27-.2-.57-.36Z" />
      </svg>
    </a>
  );
}
