import type { ZodError } from "zod";
import { prisma } from "@/lib/db";

// Plain-language messages for menu item and product form problems, so a vendor sees what to fix
// instead of "Invalid payload".
const FIELD_MESSAGES: Record<string, string> = {
  sectionId: "Choose a section for this item.",
  name: "The name needs at least 2 letters.",
  slug: "The product link can only use small letters, numbers and dashes.",
  priceCents: "The price must be between R1 and R20 000.",
  description: "The description is too long.",
  image: "The photo link is too long.",
  tags: "Use up to 12 short tags.",
  abv: "The alcohol percentage must be between 0 and 100.",
};

export function catalogInputErrorMessage(error: ZodError) {
  const fields = Object.keys(error.flatten().fieldErrors);
  const messages = fields.map((field) => FIELD_MESSAGES[field]).filter(Boolean);
  return messages.length > 0 ? messages.join(" ") : "Check the details and try again.";
}

export const LIQUOR_LICENCE_REQUIRED =
  "Liquor needs an approved, current liquor licence. Add your licence under Store details first.";

/** Whether the vendor may sell liquor right now: licence approved by Lethela and not expired. */
export async function hasCurrentLiquorLicence(vendorId: string) {
  const licensed = await prisma.vendor.findFirst({
    where: {
      id: vendorId,
      liquorVerificationStatus: "APPROVED",
      liquorLicenceExpiry: { gt: new Date() },
    },
    select: { id: true },
  });
  return Boolean(licensed);
}
