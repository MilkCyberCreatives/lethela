import { z } from "zod";
import {
  REGISTRATION_PASSWORD_MAX_LENGTH,
  REGISTRATION_PASSWORD_MIN_LENGTH,
  registrationPasswordFitsHashLimit,
} from "@/lib/registration-policy";

export const MinimalRegistrationSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Enter a valid email address.")
    .max(254)
    .transform((value) => value.toLowerCase()),
  password: z
    .string()
    .min(
      REGISTRATION_PASSWORD_MIN_LENGTH,
      `Use at least ${REGISTRATION_PASSWORD_MIN_LENGTH} characters.`,
    )
    .max(REGISTRATION_PASSWORD_MAX_LENGTH, "Password is too long.")
    .refine(registrationPasswordFitsHashLimit, "Password is too long."),
  acceptTerms: z.literal(true),
});

export function isUniqueConstraintError(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: unknown }).code === "P2002",
  );
}
