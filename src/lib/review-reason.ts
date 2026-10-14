import { z } from "zod";

// Dashboards send an empty or missing reason with approvals and everyday status changes
// (`reason: null` from the vendor order buttons, `reason: ""` from admin Approve). Treat those as
// no reason, so only a reason someone actually typed has to meet the minimum length.
export function optionalReason(min = 5, max = 500) {
  return z.preprocess(
    (value) =>
      value === null || (typeof value === "string" && value.trim() === "") ? undefined : value,
    z.string().trim().min(min).max(max).optional(),
  );
}
