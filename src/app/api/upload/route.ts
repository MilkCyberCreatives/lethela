import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCookie } from "@/lib/cookie-helpers";
import { parseVendorSessionToken } from "@/lib/vendor-session";
import { uploadStoredFile } from "@/server/supabase";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export async function POST(req: Request) {
  const session = await auth();
  const vendorSession = parseVendorSessionToken(await getCookie("vendor_session"));
  if (!session?.user?.id && !vendorSession?.userId) {
    return NextResponse.json({ ok: false, error: "Auth required" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "file required" }, { status: 400 });
  }

  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ ok: false, error: "Unsupported image format" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: "Image too large (max 5MB)" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const extension = EXTENSION_BY_TYPE[file.type] || "jpg";
  const scope = session?.user?.id
    ? `user-uploads/${session.user.id}`
    : `vendor-uploads/${vendorSession!.vendorId}`;
  const filename = `${scope}/${randomUUID()}.${extension}`;

  try {
    const uploaded = await uploadStoredFile({
      path: filename,
      buffer,
      contentType: file.type,
    });
    return NextResponse.json({ ok: true, path: uploaded.path, url: uploaded.url });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Upload failed." },
      { status: 500 },
    );
  }
}
