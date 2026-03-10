import { getOrderWhatsAppPhone } from "@/lib/whatsapp-order";

export const LEGAL_LAST_UPDATED = "10 March 2026";
export const LEGAL_COMPANY_NAME = process.env.NEXT_PUBLIC_LEGAL_ENTITY_NAME?.trim() || "Lethela";
export const LEGAL_SERVICE_AREA = "Klipfontein View, Midrand, South Africa";
export const LEGAL_SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "";
export const LEGAL_INFO_OFFICER_NAME = process.env.NEXT_PUBLIC_INFO_OFFICER_NAME?.trim() || "Lethela Support Team";
export const LEGAL_WHATSAPP_LINK = `https://wa.me/${getOrderWhatsAppPhone()}`;

export function getLegalContactOptions() {
  return [
    ...(LEGAL_SUPPORT_EMAIL
      ? [
          {
            label: LEGAL_SUPPORT_EMAIL,
            href: `mailto:${LEGAL_SUPPORT_EMAIL}`,
          },
        ]
      : []),
    {
      label: "WhatsApp Support",
      href: LEGAL_WHATSAPP_LINK,
    },
  ];
}

export function getFooterSocialLinks() {
  const links = [
    {
      label: "WhatsApp",
      href: LEGAL_WHATSAPP_LINK,
      key: "whatsapp",
    },
  ];

  const facebook = process.env.NEXT_PUBLIC_FACEBOOK_URL?.trim();
  const instagram = process.env.NEXT_PUBLIC_INSTAGRAM_URL?.trim();
  const tiktok = process.env.NEXT_PUBLIC_TIKTOK_URL?.trim();
  const x = process.env.NEXT_PUBLIC_X_URL?.trim();

  if (facebook) links.push({ label: "Facebook", href: facebook, key: "facebook" });
  if (instagram) links.push({ label: "Instagram", href: instagram, key: "instagram" });
  if (tiktok) links.push({ label: "TikTok", href: tiktok, key: "tiktok" });
  if (x) links.push({ label: "X", href: x, key: "x" });

  return links;
}

export const FOOTER_PAYMENT_METHODS = [
  { label: "Ozow", caption: "Secure checkout" },
  { label: "Instant EFT", caption: "South African banks" },
  { label: "WhatsApp Order", caption: "Manual support" },
  { label: "Cash Arrangement", caption: "By confirmation only" },
];
