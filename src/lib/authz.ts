import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export type VendorRoleType = "OWNER" | "MANAGER" | "STAFF";

export type AuthedVendor = {
  userId: string;
  vendorId: string;
  role: VendorRoleType;
  vendorSlug: string;
};

type VendorSessionState = AuthedVendor & {
  email: string;
  vendorName: string;
  isApproved: boolean;
  status: string;
};

const ROLE_RANK: Record<VendorRoleType, number> = { OWNER: 3, MANAGER: 2, STAFF: 1 };

function normalizeRole(value: string | null | undefined): VendorRoleType {
  const role = String(value || "").toUpperCase();
  return role === "OWNER" || role === "MANAGER" || role === "STAFF" ? role : "STAFF";
}

export async function getVendorSession(): Promise<VendorSessionState> {
  const session = await auth().catch(() => null);
  if (!session?.user?.id || !session.user.email) {
    throw new Error("Vendor session expired. Please sign in again.");
  }

  let membership = await prisma.vendorMember.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      role: true,
      vendor: {
        select: { id: true, slug: true, name: true, status: true, isActive: true },
      },
    },
  });

  if (!membership) {
    const ownedVendor = await prisma.vendor.findFirst({
      where: {
        OR: [{ ownerId: session.user.id }, { email: session.user.email.toLowerCase() }],
      },
      orderBy: { updatedAt: "desc" },
      select: { id: true, slug: true, name: true, status: true, isActive: true },
    });
    if (ownedVendor) {
      await prisma.vendorMember.upsert({
        where: { vendorId_userId: { vendorId: ownedVendor.id, userId: session.user.id } },
        create: { vendorId: ownedVendor.id, userId: session.user.id, role: "OWNER" },
        update: { role: "OWNER" },
      });
      membership = { role: "OWNER", vendor: ownedVendor };
    }
  }

  if (!membership) throw new Error("No vendor profile is linked to this account.");
  const status = String(membership.vendor.status || "").toUpperCase();
  return {
    userId: session.user.id,
    vendorId: membership.vendor.id,
    role: normalizeRole(membership.role),
    vendorSlug: membership.vendor.slug,
    email: session.user.email.toLowerCase(),
    vendorName: membership.vendor.name,
    isApproved: membership.vendor.isActive && ["ACTIVE", "APPROVED"].includes(status),
    status,
  };
}

export async function requireVendor(minRole: VendorRoleType = "STAFF"): Promise<AuthedVendor> {
  const session = await getVendorSession();
  if (!session.isApproved) {
    if (session.status === "REJECTED") throw new Error("Vendor application was rejected.");
    if (session.status === "SUSPENDED") throw new Error("Vendor account is suspended.");
    throw new Error("Vendor account is awaiting approval.");
  }
  if (ROLE_RANK[session.role] < ROLE_RANK[minRole]) throw new Error("Insufficient role.");
  return {
    userId: session.userId,
    vendorId: session.vendorId,
    role: session.role,
    vendorSlug: session.vendorSlug,
  };
}

export async function requireVendorAccount(
  minRole: VendorRoleType = "STAFF",
): Promise<AuthedVendor> {
  const session = await getVendorSession();
  if (session.status === "SUSPENDED") throw new Error("Vendor account is suspended.");
  if (ROLE_RANK[session.role] < ROLE_RANK[minRole]) throw new Error("Insufficient role.");
  return {
    userId: session.userId,
    vendorId: session.vendorId,
    role: session.role,
    vendorSlug: session.vendorSlug,
  };
}
