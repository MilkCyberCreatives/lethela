// src/lib/authz.ts
import { prisma } from "@/lib/db";
import { getCookie } from "@/lib/cookie-helpers";
import { parseVendorSessionToken } from "@/lib/vendor-session";

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

const ROLE_RANK: Record<VendorRoleType, number> = {
  OWNER: 3,
  MANAGER: 2,
  STAFF: 1,
};

function normalizeRole(value: string | null | undefined): VendorRoleType {
  const upper = String(value || "").toUpperCase();
  if (upper === "OWNER" || upper === "MANAGER" || upper === "STAFF") {
    return upper;
  }
  return "STAFF";
}

export async function getVendorSession(): Promise<VendorSessionState> {
  const sessionToken = await getCookie("vendor_session");
  const parsed = parseVendorSessionToken(sessionToken);

  if (!parsed) {
    throw new Error("Vendor session expired. Please sign in again.");
  }

  const [user, vendor] = await Promise.all([
    prisma.user.findUnique({
      where: { id: parsed.userId },
      select: { id: true, email: true },
    }),
    prisma.vendor.findUnique({
      where: { id: parsed.vendorId },
      select: {
        id: true,
        slug: true,
        name: true,
        status: true,
        isActive: true,
        ownerId: true,
      },
    }),
  ]);

  if (!user || !vendor) {
    throw new Error("Vendor session is no longer valid. Please sign in again.");
  }

  if (user.email.toLowerCase() !== parsed.email || vendor.slug !== parsed.vendorSlug) {
    throw new Error("Vendor session does not match current account data. Please sign in again.");
  }

  let membership = await prisma.vendorMember.findUnique({
    where: {
      vendorId_userId: {
        vendorId: vendor.id,
        userId: user.id,
      },
    },
    select: { role: true },
  });

  if (!membership && vendor.ownerId === user.id) {
    membership = await prisma.vendorMember.create({
      data: {
        vendorId: vendor.id,
        userId: user.id,
        role: "OWNER",
      },
      select: { role: true },
    });
  }

  if (!membership) {
    throw new Error("Vendor membership not found for this account.");
  }

  const status = String(vendor.status || "").toUpperCase();
  const isApproved = vendor.isActive && (status === "ACTIVE" || status === "APPROVED" || status === "");

  return {
    userId: user.id,
    vendorId: vendor.id,
    role: normalizeRole(membership.role),
    vendorSlug: vendor.slug,
    email: user.email.toLowerCase(),
    vendorName: vendor.name,
    isApproved,
    status,
  };
}

export async function requireVendor(
  minRole: VendorRoleType = "STAFF"
): Promise<AuthedVendor> {
  const session = await getVendorSession();
  const isApproved = session.isApproved;
  if (!isApproved) {
    if (session.status === "REJECTED") {
      throw new Error("Vendor application was rejected.");
    }
    throw new Error("Vendor account pending admin approval.");
  }
  if (ROLE_RANK[session.role] < ROLE_RANK[minRole]) {
    throw new Error("Insufficient role");
  }

  return {
    userId: session.userId,
    vendorId: session.vendorId,
    role: session.role,
    vendorSlug: session.vendorSlug,
  };
}
