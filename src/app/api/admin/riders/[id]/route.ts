import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminRequest } from "@/lib/admin-auth";
import {
  type RiderApplicationStatus,
  updateRiderApplicationStatus,
} from "@/lib/rider-applications";

const StatusSchema = z.object({
  status: z.enum(["PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED"]),
});

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: NextRequest, { params }: Params) {
  const guard = await requireAdminRequest(req);
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = StatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid rider status payload." }, { status: 400 });
  }

  const item = await updateRiderApplicationStatus(
    String(id || "").trim(),
    parsed.data.status as RiderApplicationStatus
  );
  if (!item) {
    return NextResponse.json({ ok: false, error: "Rider application not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, item });
}
