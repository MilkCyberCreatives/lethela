// /src/app/api/storage/upload/route.ts
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { uploadStoredFile } from "@/server/supabase";
import { withSentryRoute } from "@/server/withSentryRoute";
import { requireAdminRequest } from "@/lib/admin-auth";
import { checkRateLimit } from "@/lib/rate-limit";

const SAFE_PATH = /^[a-zA-Z0-9][a-zA-Z0-9/_\-.]{1,200}$/;
const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "application/pdf"]);
const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "application/pdf": "pdf",
};

function matchesSignature(buffer: Buffer, mime: string) {
  if (mime === "image/jpeg") return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mime === "image/png")
    return buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mime === "image/webp")
    return (
      buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WEBP"
    );
  if (mime === "image/avif") return buffer.subarray(4, 12).toString().includes("ftypavif");
  if (mime === "application/pdf") return buffer.subarray(0, 5).toString() === "%PDF-";
  return false;
}

export const POST = withSentryRoute(async (req: NextRequest) => {
  const guard = await requireAdminRequest(req);
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });
  }
  const limited = await checkRateLimit({
    key: "admin-upload",
    limit: 30,
    windowMs: 60_000,
    headers: req.headers,
  });
  if (!limited.ok)
    return NextResponse.json({ ok: false, error: "Too many uploads." }, { status: 429 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const subpath = String(form.get("path") || "").trim();

  if (!file) return NextResponse.json({ ok: false, error: "Missing file" }, { status: 400 });
  if (file.size > MAX_BYTES)
    return NextResponse.json(
      { ok: false, error: "File is too large (8 MB maximum)." },
      { status: 400 },
    );
  if (!ALLOWED.has(file.type))
    return NextResponse.json({ ok: false, error: "Unsupported file format." }, { status: 400 });
  if (!subpath) return NextResponse.json({ ok: false, error: "Missing path" }, { status: 400 });

  const filename = subpath.replace(/^\/+/, "").replace(/\/{2,}/g, "/");
  if (
    !filename.startsWith("admin-uploads/") ||
    filename.includes("..") ||
    !SAFE_PATH.test(filename)
  ) {
    return NextResponse.json(
      { ok: false, error: "Path must be a safe admin-uploads/* location." },
      { status: 400 },
    );
  }

  const arrayBuf = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuf);
  if (!matchesSignature(buffer, file.type)) {
    return NextResponse.json(
      { ok: false, error: "File content does not match its format." },
      { status: 400 },
    );
  }
  const directory = filename.includes("/")
    ? filename.slice(0, filename.lastIndexOf("/"))
    : "admin-uploads";
  const storagePath = `${directory}/${randomUUID()}.${EXTENSION_BY_TYPE[file.type]}`;

  try {
    const uploaded = await uploadStoredFile({
      path: storagePath,
      buffer,
      contentType: file.type || "application/octet-stream",
    });
    return NextResponse.json({ ok: true, path: uploaded.path, url: uploaded.url });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Upload failed." },
      { status: 500 },
    );
  }
});
