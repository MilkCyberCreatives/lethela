import { randomUUID } from "crypto";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCookie } from "@/lib/cookie-helpers";
import { parseVendorSessionToken } from "@/lib/vendor-session";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

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
  const dir = join(process.cwd(), "public", "uploads");
  mkdirSync(dir, { recursive: true });

  const extension = (file.name.split(".").pop() || "jpg").toLowerCase();
  const filename = `${randomUUID()}.${extension}`;
  const filepath = join(dir, filename);
  writeFileSync(filepath, buffer);

  return NextResponse.json({ ok: true, url: `/uploads/${filename}` });
}
