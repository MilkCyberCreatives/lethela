import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { logError } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  storageConfigSummary,
  storageProvider,
  uploadStoredFile,
} from "@/server/supabase";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const ALLOWED_DOCUMENTS = new Set([...ALLOWED_IMAGES, "application/pdf"]);
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

export async function POST(req: Request) {
  const requestId = randomUUID();

  try {
    const limited = await checkRateLimit({
      key: "upload",
      limit: 20,
      windowMs: 60_000,
      headers: req.headers,
    });
    if (!limited.ok) {
      return NextResponse.json(
        { ok: false, error: "Too many uploads. Please wait and try again." },
        { status: 429 },
      );
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, error: "Auth required" }, { status: 401 });
    }

    let form: FormData;
    try {
      form = await req.formData();
    } catch (error) {
      logError("Upload request body could not be parsed.", {
        requestId,
        userId: session.user.id,
        error: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json(
        { ok: false, error: "The upload request could not be read. Please choose the file again." },
        { status: 400 },
      );
    }

    const file = form.get("file");
    const kind = String(form.get("kind") || "profile").toLowerCase();
    const isDocument = kind === "document";

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "file required" }, { status: 400 });
    }

    const allowed = isDocument ? ALLOWED_DOCUMENTS : ALLOWED_IMAGES;
    if (!allowed.has(file.type)) {
      return NextResponse.json({ ok: false, error: "Unsupported file format" }, { status: 400 });
    }

    if (file.size <= 0) {
      return NextResponse.json({ ok: false, error: "The selected file is empty." }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ ok: false, error: "File too large (max 5MB)" }, { status: 400 });
    }

    const config = storageConfigSummary();
    if (storageProvider() === "none") {
      logError("Upload storage is not configured.", {
        requestId,
        userId: session.user.id,
        kind,
        storage: config,
      });
      return NextResponse.json(
        {
          ok: false,
          error: "File storage is temporarily unavailable. Please try again shortly.",
          requestId,
        },
        { status: 503 },
      );
    }

    if (isDocument && config.provider === "supabase" && !config.hasPrivateBucket) {
      logError("Private upload bucket is not configured.", {
        requestId,
        userId: session.user.id,
        kind,
        storage: config,
      });
      return NextResponse.json(
        {
          ok: false,
          error: "Secure document storage is temporarily unavailable. Please try again shortly.",
          requestId,
        },
        { status: 503 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!matchesSignature(buffer, file.type)) {
      return NextResponse.json(
        { ok: false, error: "File content does not match its format." },
        { status: 400 },
      );
    }

    const extension = EXTENSION_BY_TYPE[file.type] || "jpg";
    const visibility = isDocument ? "private" : "public";
    const scope = `${visibility}/${session.user.role === "RIDER" ? "rider" : "user"}-uploads/${session.user.id}`;
    const filename = `${scope}/${randomUUID()}.${extension}`;

    try {
      const uploaded = await uploadStoredFile({
        path: filename,
        buffer,
        contentType: file.type,
        visibility,
      });
      const url =
        visibility === "private"
          ? `/api/files?path=${encodeURIComponent(uploaded.path)}`
          : uploaded.url;
      return NextResponse.json({ ok: true, path: uploaded.path, url, visibility });
    } catch (error) {
      logError("Upload storage operation failed.", {
        requestId,
        userId: session.user.id,
        role: session.user.role,
        kind,
        visibility,
        mime: file.type,
        size: file.size,
        storage: config,
        error: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json(
        {
          ok: false,
          error: "Upload failed. Please try again shortly.",
          requestId,
        },
        { status: 500 },
      );
    }
  } catch (error) {
    logError("Unexpected upload route failure.", {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        ok: false,
        error: "Upload failed. Please try again shortly.",
        requestId,
      },
      { status: 500 },
    );
  }
}
