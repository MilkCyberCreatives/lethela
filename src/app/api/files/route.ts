import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAdminRequest } from "@/lib/admin-auth";
import { getVendorSession } from "@/lib/authz";
import { readPrivateStoredFile } from "@/server/supabase";

const SAFE_PATH = /^private\/[a-zA-Z0-9][a-zA-Z0-9/_\-.]{1,220}$/;
const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".pdf": "application/pdf",
};

export async function GET(req: NextRequest) {
  const filename = String(req.nextUrl.searchParams.get("path") || "").trim();
  if (!SAFE_PATH.test(filename) || filename.includes("..")) {
    return NextResponse.json({ ok: false, error: "Invalid document path." }, { status: 400 });
  }

  const session = await auth().catch(() => null);
  const vendor = await getVendorSession().catch(() => null);
  const admin = await requireAdminRequest(req);
  const allowed =
    (session?.user?.id && filename.startsWith(`private/rider-uploads/${session.user.id}/`)) ||
    (session?.user?.id && filename.startsWith(`private/user-uploads/${session.user.id}/`)) ||
    (vendor?.vendorId && filename.startsWith(`private/vendor-uploads/${vendor.vendorId}/`)) ||
    admin.ok;
  if (!allowed)
    return NextResponse.json({ ok: false, error: "Document access denied." }, { status: 403 });

  try {
    const data = await readPrivateStoredFile(filename);
    const contentType =
      CONTENT_TYPES[path.extname(filename).toLowerCase()] || "application/octet-stream";
    return new NextResponse(data, {
      headers: {
        "content-type": contentType,
        "content-disposition": `attachment; filename="${path.basename(filename)}"`,
        "cache-control": "private, no-store, max-age=0",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Document not found." }, { status: 404 });
  }
}
