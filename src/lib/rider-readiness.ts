export const RIDER_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "CHANGES_REQUESTED",
  "APPROVED",
  "REJECTED",
  "SUSPENDED",
  "OFFLINE",
  "AVAILABLE",
  "BUSY",
] as const;

export type RiderStatus = (typeof RIDER_STATUSES)[number];

type RiderReadinessInput = {
  fullName?: string | null;
  phone?: string | null;
  idNumberLast4?: string | null;
  idDocumentUrl?: string | null;
  profilePhotoUrl?: string | null;
  vehicleType?: string | null;
  vehicleRegistration?: string | null;
  vehicleMakeModel?: string | null;
  licenseCode?: string | null;
  licenceDocumentUrl?: string | null;
  licenceExpiry?: Date | string | null;
  vehicleDocumentUrl?: string | null;
  province?: string | null;
  municipality?: string | null;
  township?: string | null;
  preferredZones?: string | null;
  workingDays?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  bankAccountName?: string | null;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankBranchCode?: string | null;
  bankAccountType?: string | null;
  hasSmartphone?: boolean | null;
  lawfulWorkDeclared?: boolean | null;
  conductAccepted?: boolean | null;
  liquorIdCheckAccepted?: boolean | null;
};

function hasText(value: string | null | undefined, minimum = 2) {
  return Boolean(value && value.trim().length >= minimum);
}

function listHasItems(value: string | null | undefined) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) && parsed.length > 0;
  } catch {
    return hasText(value);
  }
}

export const DELIVERY_METHODS = ["WALKING", "BICYCLE", "SCOOTER", "MOTORCYCLE", "CAR"] as const;

/**
 * What a rider must have before Lethela can approve them. Only what is needed to reach the
 * rider and send them deliveries is required; documents, vehicle papers, working times and
 * banking can be added later in the profile.
 */
export function getRiderReadiness(input: RiderReadinessInput) {
  const vehicleType = String(input.vehicleType || "").toUpperCase();
  const requiresVehicle = ["SCOOTER", "MOTORCYCLE", "CAR"].includes(vehicleType);
  const checks = [
    {
      key: "personal",
      label: "Name and phone number",
      required: true,
      complete: hasText(input.fullName) && hasText(input.phone, 8),
    },
    {
      key: "delivery-method",
      label: "How you deliver",
      required: true,
      complete: (DELIVERY_METHODS as readonly string[]).includes(vehicleType),
    },
    {
      key: "service-area",
      label: "Area you deliver in",
      required: true,
      complete: hasText(input.province) && hasText(input.township),
    },
    {
      key: "safety",
      label: "Rider agreement",
      required: true,
      complete: Boolean(
        input.hasSmartphone &&
          input.lawfulWorkDeclared &&
          input.conductAccepted &&
          input.liquorIdCheckAccepted,
      ),
    },
    {
      key: "identity",
      label: "ID and photo",
      required: false,
      complete:
        /^\d{4}$/.test(input.idNumberLast4 || "") &&
        hasText(input.idDocumentUrl) &&
        hasText(input.profilePhotoUrl),
    },
    {
      key: "vehicle",
      label: "Vehicle and licence",
      required: false,
      complete:
        !requiresVehicle ||
        (hasText(input.vehicleRegistration) &&
          hasText(input.vehicleMakeModel) &&
          hasText(input.licenseCode) &&
          hasText(input.licenceDocumentUrl) &&
          Boolean(input.licenceExpiry) &&
          hasText(input.vehicleDocumentUrl)),
    },
    {
      key: "availability",
      label: "When you can work",
      required: false,
      complete:
        listHasItems(input.workingDays) && hasText(input.startTime) && hasText(input.endTime),
    },
    {
      key: "banking",
      label: "Bank account for payouts",
      required: false,
      complete:
        hasText(input.bankAccountName) &&
        hasText(input.bankName) &&
        hasText(input.bankAccountNumber, 6) &&
        hasText(input.bankBranchCode) &&
        hasText(input.bankAccountType),
    },
  ];
  const required = checks.filter((check) => check.required);
  const completed = required.filter((check) => check.complete).length;
  return {
    checks,
    percent: Math.round((completed / required.length) * 100),
    canSubmit: completed === required.length,
    missing: required.filter((check) => !check.complete).map((check) => check.label),
    later: checks.filter((check) => !check.required && !check.complete).map((check) => check.label),
  };
}
