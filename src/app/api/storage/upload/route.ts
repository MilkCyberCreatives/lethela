// /src/app/api/storage/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { uploadStoredFile } from "@/server/supabase";
import { withSentryRoute } from "@/server/withSentryRoute";
import { requireAdminRequest } from "@/lib/admin-auth";

const SAFE_PATH = /^[a-zA-Z0-9][a-zA-Z0-9/_\-.]{1,200}$/;

export const POST = withSentryRoute(async (req: NextRequest) => {
  const guard = await requireAdminRequest(req);
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });
  }

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const subpath = String(form.get("path") || "").trim();

  if (!file) return NextResponse.json({ ok: false, error: "Missing file" }, { status: 400 });
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

  try {
    const uploaded = await uploadStoredFile({
      path: filename,
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
