type OrderItem = {
  name: string;
  qty: number;
  priceCents: number;
};

type WhatsAppOrderPayload = {
  items: OrderItem[];
  subtotalCents: number;
  deliveryCents: number;
  riderTipCents?: number;
  totalCents: number;
  customerName?: string | null;
  customerPhone?: string | null;
  deliveryAddress?: string | null;
  destinationSuburb?: string | null;
  orderReference?: string | null;
  vendorSlug?: string | null;
  vendorName?: string | null;
};

function sanitizePhone(raw: string) {
  return raw.replace(/\D/g, "");
}

function formatR(valueCents: number) {
  return `R ${(valueCents / 100).toFixed(2)}`;
}

export function getOrderWhatsAppPhone() {
  const envPhone =
    process.env.NEXT_PUBLIC_WHATSAPP_ORDER_PHONE || process.env.NEXT_PUBLIC_WHATSAPP_PHONE;
  const fallback = "27723908919";
  return sanitizePhone(envPhone || fallback);
}

export function buildWhatsAppOrderMessage(payload: WhatsAppOrderPayload) {
  const destination = payload.destinationSuburb?.trim() || "Klipfontein View, Midrand";
  const orderReference =
    payload.orderReference?.trim() || `WA-${Date.now().toString(36).toUpperCase()}`;
  const lines = payload.items.map(
    (item) => `- ${item.qty} x ${item.name} (${formatR(item.priceCents * item.qty)})`,
  );

  return [
    "Hello Lethela, I would like to place this order via WhatsApp.",
    "",
    payload.customerName ? `Customer name: ${payload.customerName}` : "Customer name: ",
    payload.customerPhone ? `Customer phone: ${payload.customerPhone}` : "Customer phone: ",
    `Order reference: ${orderReference}`,
    `Area: ${destination}`,
    `Delivery address: ${payload.deliveryAddress?.trim() || destination}`,
    payload.vendorName || payload.vendorSlug
      ? `Vendor: ${payload.vendorName || payload.vendorSlug}`
      : "Vendor: ",
    "",
    "Items:",
    ...lines,
    "",
    `Subtotal: ${formatR(payload.subtotalCents)}`,
    `Delivery: ${formatR(payload.deliveryCents)}`,
    `Rider tip: ${formatR(payload.riderTipCents || 0)}`,
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
