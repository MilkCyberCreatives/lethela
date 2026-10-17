import { auth } from "@/auth";
import { prisma } from "@/lib/db";

/** The signed-in rider's application, or null when the session is not a rider's. */
export async function currentRider() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id || (session.user.role !== "RIDER" && session.user.role !== "ADMIN")) {
    return null;
  }
  const email = session.user.email?.trim().toLowerCase() || null;
  return prisma.riderApplication.findFirst({
    where: { OR: [{ userId: session.user.id }, ...(email ? [{ userId: null, email }] : [])] },
    orderBy: { updatedAt: "desc" },
    select: { id: true, status: true, availableNow: true },
  });
}
