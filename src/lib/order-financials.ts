export function calculateOrderFinancials(input: {
  subtotalCents: number;
  deliveryFeeCents: number;
  riderTipCents?: number;
  platformCommissionBps?: number;
}) {
  const subtotalCents = Math.max(0, Math.round(input.subtotalCents));
  const deliveryFeeCents = Math.max(0, Math.round(input.deliveryFeeCents));
  const riderTipCents = Math.max(0, Math.round(input.riderTipCents || 0));
  const commissionBps = Math.min(10_000, Math.max(0, Math.round(input.platformCommissionBps || 0)));
  const platformFeeCents = Math.round((subtotalCents * commissionBps) / 10_000);
  const vendorPayoutCents = subtotalCents - platformFeeCents;
  const riderPayoutCents = deliveryFeeCents + riderTipCents;
  return {
    subtotalCents,
    deliveryFeeCents,
    riderTipCents,
    platformFeeCents,
    vendorPayoutCents,
    riderPayoutCents,
    totalCents: subtotalCents + deliveryFeeCents + riderTipCents,
  };
}
