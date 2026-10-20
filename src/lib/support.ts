const DEFAULT_SUPPORT_NUMBER = "27723908919";

function supportNumber() {
  return (
    process.env.NEXT_PUBLIC_WHATSAPP_SUPPORT_NUMBER?.replace(/\D/g, "") || DEFAULT_SUPPORT_NUMBER
  );
}

export function buildWhatsAppSupportLink(message?: string) {
  const text =
    message?.trim() || "Hello Lethela, I need help with ordering or with the launch in my area.";
  return `https://wa.me/${supportNumber()}?text=${encodeURIComponent(text)}`;
}

export function buildLaunchNotificationLink(area = "Klipfontein View") {
  return buildWhatsAppSupportLink(`Hello Lethela, I would like to place an order in ${area}.`);
}

/** WhatsApp order link for a store that is still putting its menu on Lethela. */
export function buildStoreOrderWhatsAppLink(storeName: string, area = "Klipfontein View") {
  return buildWhatsAppSupportLink(
    `Hello Lethela, I would like to order from ${storeName.trim()} in ${area}.`,
  );
}
