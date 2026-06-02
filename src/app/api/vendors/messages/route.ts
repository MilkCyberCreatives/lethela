import { NextResponse } from "next/server";
import { getVendorSession } from "@/lib/authz";
import { listMessagesForVendor } from "@/lib/platform-messages";

export async function GET() {
  try {
    const session = await getVendorSession();
    const items = await listMessagesForVendor(session.vendorId, 30);
    return NextResponse.json({ ok: true, items });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Not signed in as a vendor.";
    return NextResponse.json({ ok: false, error: message }, { status: 401 });
  }
}
