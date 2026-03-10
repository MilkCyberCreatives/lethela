// /src/app/api/storage/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createAdminClient } from "@/server/supabase";
import { withSentryRoute } from "@/server/withSentryRoute";

export const POST = withSentryRoute(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ ok: false, error: "Auth required" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const subpath = String(form.get("path") || "").trim();

  if (!file) return NextResponse.json({ ok: false, error: "Missing file" }, { status: 400 });
  if (!subpath) return NextResponse.json({ ok: false, error: "Missing path" }, { status: 400 });

  const arrayBuf = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuf);

  const supa = createAdminClient();
  const bucket = process.env.SUPABASE_BUCKET!;
  const filename = subpath.replace(/^\/+/, ""); // normalize
  const { data, error } = await supa.storage.from(bucket).upload(filename, buffer, {
    contentType: file.type || "application/octet-stream",
    upsert: true
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const { data: pub } = supa.storage.from(bucket).getPublicUrl(filename);
  return NextResponse.json({ ok: true, path: data?.path, url: pub?.publicUrl });
});
