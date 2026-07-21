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

export function getRiderReadiness(input: RiderReadinessInput) {
  const vehicleType = String(input.vehicleType || "").toUpperCase();
  const requiresVehicle = ["SCOOTER", "MOTORCYCLE", "CAR"].includes(vehicleType);
  const checks = [
    {
      key: "personal",
      label: "Personal details",
      complete:
        hasText(input.fullName) &&
        hasText(input.phone, 8) &&
        /^\d{4}$/.test(input.idNumberLast4 || "") &&
        hasText(input.idDocumentUrl) &&
        hasText(input.profilePhotoUrl),
    },
    {
      key: "delivery-method",
      label: "Delivery method",
      complete: ["WALKING", "BICYCLE", "SCOOTER", "MOTORCYCLE", "CAR"].includes(vehicleType),
    },
    {
      key: "vehicle",
      label: "Vehicle details",
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
      key: "service-area",
      label: "Service area",
      complete:
        hasText(input.province) &&
        hasText(input.municipality) &&
        hasText(input.township) &&
        listHasItems(input.preferredZones),
    },
    {
      key: "availability",
      label: "Availability",
      complete:
        listHasItems(input.workingDays) && hasText(input.startTime) && hasText(input.endTime),
    },
    {
      key: "banking",
      label: "Banking and payouts",
      complete:
        hasText(input.bankAccountName) &&
        hasText(input.bankName) &&
        hasText(input.bankAccountNumber, 6) &&
        hasText(input.bankBranchCode) &&
        hasText(input.bankAccountType),
    },
    {
      key: "safety",
      label: "Safety declarations",
      complete: Boolean(
        input.hasSmartphone &&
          input.lawfulWorkDeclared &&
          input.conductAccepted &&
          input.liquorIdCheckAccepted,
      ),
    },
  ];
  const completed = checks.filter((check) => check.complete).length;
  return {
    checks,
    percent: Math.round((completed / checks.length) * 100),
    canSubmit: completed === checks.length,
    missing: checks.filter((check) => !check.complete).map((check) => check.label),
  };
}
