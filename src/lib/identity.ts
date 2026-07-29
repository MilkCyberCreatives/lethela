import { z } from "zod";

export function normalizeEmailAddress(value: string) {
  return value.trim().toLowerCase();
}

export const NormalizedEmailSchema = z
  .string()
  .trim()
  .email("Enter a valid email address.")
  .max(254)
  .transform(normalizeEmailAddress);

export function emailAddressesMatch(left: string, right: string) {
  return normalizeEmailAddress(left) === normalizeEmailAddress(right);
}
