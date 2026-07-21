export const VENDOR_STATUS = {
  DRAFT: "DRAFT",
  SUBMITTED: "SUBMITTED",
  UNDER_REVIEW: "UNDER_REVIEW",
  CHANGES_REQUESTED: "CHANGES_REQUESTED",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  SUSPENDED: "SUSPENDED",
  ACTIVE: "ACTIVE",
} as const;

export type VendorStatus = (typeof VENDOR_STATUS)[keyof typeof VENDOR_STATUS];

export const STORE_TYPES = [
  "Spaza shop",
  "Grocery store",
  "Local food vendor",
  "Restaurant",
  "Franchise/established brand",
  "Other",
] as const;

export type VendorReadinessInput = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  suburb?: string | null;
  city?: string | null;
  province?: string | null;
  municipality?: string | null;
  township?: string | null;
  sectionArea?: string | null;
  storeType?: string | null;
  cuisine?: unknown;
  deliveryFee?: number | null;
  etaMins?: number | null;
  kycIdUrl?: string | null;
  kycProofUrl?: string | null;
  bankName?: string | null;
  bankAccountName?: string | null;
  bankAccountNumber?: string | null;
  bankBranchCode?: string | null;
  productCount?: number | null;
  menuItemCount?: number | null;
  operatingHoursCount?: number | null;
  hasBanking?: boolean | null;
};

export function normalizeVendorStatus(status: string | null | undefined) {
  const normalized = String(status || "")
    .trim()
    .toUpperCase();
  if (normalized === "PENDING") return VENDOR_STATUS.SUBMITTED;
  if (normalized === "ACTIVE") return VENDOR_STATUS.APPROVED;
  if (normalized === "APPROVED") return VENDOR_STATUS.APPROVED;
  if (normalized === "DRAFT" || normalized === "DRAFT_PROFILE") return VENDOR_STATUS.DRAFT;
  if (normalized === "UNDER_REVIEW") return VENDOR_STATUS.UNDER_REVIEW;
  if (normalized === "CHANGES_REQUESTED") return VENDOR_STATUS.CHANGES_REQUESTED;
  if (normalized === "SUBMITTED" || normalized === "SUBMITTED_FOR_APPROVAL") {
    return VENDOR_STATUS.SUBMITTED;
  }
  if (normalized === "REJECTED") return VENDOR_STATUS.REJECTED;
  if (normalized === "SUSPENDED") return VENDOR_STATUS.SUSPENDED;
  return VENDOR_STATUS.DRAFT;
}

export function vendorStatusLabel(status: string | null | undefined) {
  return normalizeVendorStatus(status).replaceAll("_", " ").toLowerCase();
}

function hasText(value: string | null | undefined) {
  return Boolean(value && value.trim().length > 1);
}

export function parseStoreCategories(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed.map((item) => String(item).trim()).filter(Boolean) : [];
  } catch {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
}

export function getVendorReadiness(input: VendorReadinessInput) {
  const categories = parseStoreCategories(input.cuisine);
  const productCount = Number(input.productCount || 0);
  const menuItemCount = Number(input.menuItemCount || 0);
  const checks = [
    {
      key: "store-details",
      label: "Store details",
      required: true,
      complete:
        hasText(input.name) &&
        hasText(input.email) &&
        hasText(input.phone) &&
        hasText(input.storeType),
    },
    {
      key: "trading-address",
      label: "Trading address",
      required: true,
      complete:
        hasText(input.province) &&
        hasText(input.city) &&
        (hasText(input.township) || hasText(input.suburb)) &&
        hasText(input.address),
    },
    {
      key: "category",
      label: "Category and store type",
      required: true,
      complete: categories.length > 0,
    },
    {
      key: "operating-hours",
      label: "Operating hours",
      required: true,
      complete: Number(input.operatingHoursCount || 0) > 0,
    },
    {
      key: "preparation-time",
      label: "Preparation time",
      required: true,
      complete: Number(input.etaMins || 0) >= 10,
    },
    {
      key: "products-menu",
      label: "Products or menu",
      required: true,
      complete: productCount > 0 || menuItemCount > 0,
    },
    {
      key: "banking",
      label: "Banking details",
      required: true,
      complete:
        Boolean(input.hasBanking) ||
        (hasText(input.bankName) &&
          hasText(input.bankAccountName) &&
          hasText(input.bankAccountNumber)),
    },
    {
      key: "owner-documents",
      label: "Owner documents",
      required: true,
      complete: hasText(input.kycIdUrl) && hasText(input.kycProofUrl),
    },
  ];

  const requiredChecks = checks.filter((check) => check.required);
  const completedRequired = requiredChecks.filter((check) => check.complete).length;
  return {
    checks,
    requiredTotal: requiredChecks.length,
    completedRequired,
    percent: Math.round((completedRequired / requiredChecks.length) * 100),
    canSubmit: completedRequired === requiredChecks.length,
  };
}

export function isApprovedVendorStatus(status: string | null | undefined, isActive = true) {
  const normalized = normalizeVendorStatus(status);
  return isActive && normalized === VENDOR_STATUS.APPROVED;
}

export function isPublicReadyVendor(
  input: VendorReadinessInput & { status?: string | null; isActive?: boolean | null },
) {
  if (!isApprovedVendorStatus(input.status, Boolean(input.isActive))) return false;
  return getVendorReadiness(input).canSubmit;
}
