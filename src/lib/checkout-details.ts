// Delivery details a customer typed at checkout, kept on their own device so the
// next order does not start from an empty form. Nothing here is sent to the server.

const STORAGE_KEY = "lethela_checkout_details_v1";

export type SavedCheckoutDetails = {
  customerName: string;
  customerPhone: string;
  whatsappNumber: string;
  standNumber: string;
  streetSection: string;
  landmark: string;
  deliveryNotes: string;
};

const FIELD_LIMITS: Record<keyof SavedCheckoutDetails, number> = {
  customerName: 120,
  customerPhone: 40,
  whatsappNumber: 40,
  standNumber: 120,
  streetSection: 120,
  landmark: 180,
  deliveryNotes: 500,
};

export function normalizeCheckoutDetails(input: unknown): SavedCheckoutDetails | null {
  if (!input || typeof input !== "object") return null;
  const source = input as Record<string, unknown>;
  const details = {} as SavedCheckoutDetails;
  let hasValue = false;
  for (const [field, limit] of Object.entries(FIELD_LIMITS) as Array<
    [keyof SavedCheckoutDetails, number]
  >) {
    const value = typeof source[field] === "string" ? source[field].trim().slice(0, limit) : "";
    details[field] = value;
    if (value) hasValue = true;
  }
  return hasValue ? details : null;
}

export function readCheckoutDetails(): SavedCheckoutDetails | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeCheckoutDetails(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function saveCheckoutDetails(details: SavedCheckoutDetails) {
  if (typeof window === "undefined") return;
  const normalized = normalizeCheckoutDetails(details);
  try {
    if (normalized) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Private browsing or blocked storage: the form still works, it just is not remembered.
  }
}

export function clearCheckoutDetails() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore blocked storage.
  }
}
