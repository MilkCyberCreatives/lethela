import { SITE_URL } from "@/lib/site";

// Lets an admin remind an unfinished store or rider from their own WhatsApp or email app, so a
// reminder still goes out when Lethela's own email or WhatsApp sending is not working.

export type FollowUpKind = "store" | "rider";

/** South African numbers for wa.me: 0821234567 and +27 82 123 4567 both become 27821234567. */
export function whatsAppNumber(phone: string | null | undefined) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("0")) return `27${digits.slice(1)}`;
  if (digits.length === 9 && !digits.startsWith("0")) return `27${digits}`;
  return digits.length >= 10 ? digits : null;
}

function dashboardUrl(kind: FollowUpKind) {
  return `${SITE_URL}${kind === "store" ? "/vendors/dashboard" : "/rider/dashboard/profile"}`;
}

export function followUpMessage(input: {
  kind: FollowUpKind;
  name?: string | null;
  missing: string[];
}) {
  const name = String(input.name || "").trim();
  const greeting = name && name.toLowerCase() !== "new vendor" ? `Hi ${name}` : "Hi there";
  const missing = input.missing.map((item) => item.toLowerCase());
  const goal =
    input.kind === "store"
      ? "Your store is almost ready to take orders on Lethela."
      : "Your rider profile is almost ready, so you can start getting delivery requests on Lethela.";
  const after =
    input.kind === "store"
      ? "Once these are saved, your store is approved automatically and customers can order."
      : "Once these are saved, you are approved automatically and can go online.";
  return [
    `${greeting}, this is the Lethela team.`,
    goal,
    missing.length ? `Still needed: ${missing.join(", ")}.` : "",
    `Sign in here to finish: ${dashboardUrl(input.kind)}`,
    after,
    "Reply here if you need help.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function followUpLinks(input: {
  kind: FollowUpKind;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  missing: string[];
}) {
  const text = followUpMessage(input);
  const number = whatsAppNumber(input.phone);
  const email = String(input.email || "").trim();
  const subject =
    input.kind === "store"
      ? "Your Lethela store is almost ready"
      : "Your Lethela rider profile is almost ready";
  return {
    whatsapp: number ? `https://wa.me/${number}?text=${encodeURIComponent(text)}` : null,
    email:
      email && email.includes("@")
        ? `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`
        : null,
  };
}
