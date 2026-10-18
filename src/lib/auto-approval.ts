import { prisma } from "@/lib/db";
import { logAdminAudit } from "@/lib/admin-audit";
import { notifyApplicant } from "@/lib/application-notifications";
import { getRiderReadiness } from "@/lib/rider-readiness";
import { getVendorReadiness } from "@/lib/vendor-readiness";

// Gauta (18 Oct 2026): approve every registered store and rider so Lethela can start operating.
// A store or rider is approved as soon as their profile has what an order needs (the same
// readiness checks the admin Approve button uses). Only a store or rider Lethela suspended stays
// off. Set AUTO_APPROVE_ACCOUNTS=false to go back to approving by hand in /admin.
const WAITING_STATUSES = [
  "DRAFT",
  "PENDING",
  "SUBMITTED",
  "UNDER_REVIEW",
  "CHANGES_REQUESTED",
  "REJECTED",
];
const ACTOR = "auto-approval";

export function autoApprovalEnabled() {
  return process.env.AUTO_APPROVE_ACCOUNTS?.trim().toLowerCase() !== "false";
}

export async function autoApproveVendor(vendorId: string) {
  if (!autoApprovalEnabled()) return false;
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    select: {
      id: true,
      name: true,
      slug: true,
      email: true,
      phone: true,
      address: true,
      suburb: true,
      city: true,
      province: true,
      municipality: true,
      township: true,
      sectionArea: true,
      storeType: true,
      cuisine: true,
      etaMins: true,
      kycIdUrl: true,
      kycProofUrl: true,
      bankName: true,
      bankAccountName: true,
      bankAccountNumber: true,
      bankBranchCode: true,
      status: true,
      ownerId: true,
      owner: {
        select: {
          role: true,
          passwordHash: true,
          accounts: { select: { provider: true }, take: 1 },
        },
      },
      _count: {
        select: { products: true, items: true, hours: { where: { closed: false } } },
      },
    },
  });
  if (!vendor || !WAITING_STATUSES.includes(String(vendor.status).toUpperCase())) return false;

  const readiness = getVendorReadiness({
    ...vendor,
    productCount: vendor._count.products,
    menuItemCount: vendor._count.items,
    operatingHoursCount: vendor._count.hours,
  });
  // The owner must be able to sign in to run the store.
  const ownerCanSignIn = Boolean(vendor.owner?.passwordHash || vendor.owner?.accounts.length);
  if (!readiness.canSubmit || !vendor.ownerId || !ownerCanSignIn) return false;

  const updated = await prisma.vendor.updateMany({
    where: { id: vendor.id, status: vendor.status },
    data: { status: "APPROVED", isActive: true, reviewReason: null },
  });
  if (updated.count !== 1) return false;

  const ownerId = vendor.ownerId;
  await prisma.vendorMember.upsert({
    where: { vendorId_userId: { vendorId: vendor.id, userId: ownerId } },
    update: { role: "OWNER" },
    create: { vendorId: vendor.id, userId: ownerId, role: "OWNER" },
  });
  if (vendor.owner?.role !== "ADMIN" && vendor.owner?.role !== "VENDOR") {
    await prisma.user.update({ where: { id: ownerId }, data: { role: "VENDOR" } });
  }

  await logAdminAudit({
    actor: ACTOR,
    action: "approve_vendor",
    targetType: "vendor",
    targetId: vendor.id,
    before: { status: vendor.status },
    after: { status: "APPROVED", isActive: true },
  });
  if (vendor.email && vendor.phone) {
    await notifyApplicant({
      kind: "vendor",
      name: vendor.name,
      email: vendor.email,
      phone: vendor.phone,
      status: "approved",
      reference: vendor.slug,
    }).catch(() => null);
  }
  return true;
}

export async function autoApproveRider(riderId: string) {
  if (!autoApprovalEnabled()) return false;
  const rider = await prisma.riderApplication.findUnique({
    where: { id: riderId },
    include: {
      user: { select: { passwordHash: true, accounts: { select: { provider: true }, take: 1 } } },
    },
  });
  if (!rider || !WAITING_STATUSES.includes(String(rider.status).toUpperCase())) return false;
  const riderCanSignIn = Boolean(rider.user?.passwordHash || rider.user?.accounts.length);
  if (!getRiderReadiness(rider).canSubmit || !riderCanSignIn) return false;

  const updated = await prisma.riderApplication.updateMany({
    where: { id: rider.id, status: rider.status },
    data: { status: "APPROVED", reviewReason: null },
  });
  if (updated.count !== 1) return false;

  await logAdminAudit({
    actor: ACTOR,
    action: "set_rider_approved",
    targetType: "rider_application",
    targetId: rider.id,
    before: { status: rider.status },
    after: { status: "APPROVED" },
  });
  await notifyApplicant({
    kind: "rider",
    name: rider.fullName,
    email: rider.email,
    phone: rider.phone,
    status: "approved",
    reference: rider.id,
  }).catch(() => null);
  return true;
}

let lastSweepAt = 0;

/** Approves every waiting store and rider whose profile is ready. Run by the order sweep cron. */
export async function autoApproveReadyAccounts() {
  // The cron endpoint is open, so one server instance checks at most once a minute.
  if (!autoApprovalEnabled() || Date.now() - lastSweepAt < 60_000) return { vendors: 0, riders: 0 };
  lastSweepAt = Date.now();
  const [vendors, riders] = await Promise.all([
    prisma.vendor.findMany({
      where: { status: { in: WAITING_STATUSES } },
      select: { id: true },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
    prisma.riderApplication.findMany({
      where: { status: { in: WAITING_STATUSES } },
      select: { id: true },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
  ]);
  let approvedVendors = 0;
  let approvedRiders = 0;
  for (const vendor of vendors) {
    if (await autoApproveVendor(vendor.id).catch(() => false)) approvedVendors += 1;
  }
  for (const rider of riders) {
    if (await autoApproveRider(rider.id).catch(() => false)) approvedRiders += 1;
  }
  return { vendors: approvedVendors, riders: approvedRiders };
}
