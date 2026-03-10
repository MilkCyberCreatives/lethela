type OrderItem = {
  name: string;
  qty: number;
  priceCents: number;
};

type WhatsAppOrderPayload = {
  items: OrderItem[];
  subtotalCents: number;
  deliveryCents: number;
  totalCents: number;
  destinationSuburb?: string | null;
  vendorSlug?: string | null;
};

function sanitizePhone(raw: string) {
  return raw.replace(/\D/g, "");
}

function formatR(valueCents: number) {
  return `R ${(valueCents / 100).toFixed(2)}`;
}

export function getOrderWhatsAppPhone() {
  const envPhone = process.env.NEXT_PUBLIC_WHATSAPP_ORDER_PHONE || process.env.NEXT_PUBLIC_WHATSAPP_PHONE;
  const fallback = "27723908919";
  return sanitizePhone(envPhone || fallback);
}

export function buildWhatsAppOrderMessage(payload: WhatsAppOrderPayload) {
  const destination = payload.destinationSuburb?.trim() || "Klipfontein View, Midrand";
  const lines = payload.items.map((item) => `- ${item.qty} x ${item.name} (${formatR(item.priceCents * item.qty)})`);

  return [
    "Hello Lethela, I would like to place this order via WhatsApp.",
    "",
    `Area: ${destination}`,
    payload.vendorSlug ? `Vendor: ${payload.vendorSlug}` : null,
    "",
    "Items:",
    ...lines,
    "",
    `Subtotal: ${formatR(payload.subtotalCents)}`,
    `Delivery: ${formatR(payload.deliveryCents)}`,
    `Total: ${formatR(payload.totalCents)}`,
    "",
    "I prefer to pay offline/cash. Please confirm this order.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildWhatsAppOrderLink(payload: WhatsAppOrderPayload) {
  const phone = getOrderWhatsAppPhone();
  const text = buildWhatsAppOrderMessage(payload);
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}
