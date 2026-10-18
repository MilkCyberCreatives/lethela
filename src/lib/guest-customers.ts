import { prisma } from "@/lib/db";

// Guests check out without an account, but Lethela keeps their name and phone as a customer
// record so admins can see and help them, and repeat orders from the same phone are grouped.
// The record has no password, so nobody can sign in to it; its email is a placeholder.
export const GUEST_EMAIL_DOMAIN = "guest.lethela.invalid";

export function isGuestEmail(email: string | null | undefined) {
  return String(email || "")
    .toLowerCase()
    .endsWith(`@${GUEST_EMAIL_DOMAIN}`);
}

/** South African numbers in one form: 0821234567 and +27 82 123 4567 both become 27821234567. */
export function normalizeGuestPhone(phone: string) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("0")) return `27${digits.slice(1)}`;
  return digits;
}

/** Finds or creates the guest customer for this phone number. Never throws. */
export async function rememberGuestCustomer(input: { name: string; phone: string }) {
  const phoneKey = normalizeGuestPhone(input.phone);
  if (phoneKey.length < 9) return null;
  const email = `guest-${phoneKey}@${GUEST_EMAIL_DOMAIN}`;
  const name = input.name.trim().slice(0, 120) || null;
  try {
    const user = await prisma.user.upsert({
      where: { email },
      update: { name, phone: input.phone.trim().slice(0, 40) },
      create: { email, name, phone: input.phone.trim().slice(0, 40), role: "CUSTOMER" },
      select: { id: true },
    });
    return user.id;
  } catch {
    return null;
  }
}
