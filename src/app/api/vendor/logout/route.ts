// src/app/api/vendor/logout/route.ts
import { NextResponse } from "next/server";
import { clearVendorSession } from "@/lib/vendor-session";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearVendorSession(response);
  return response;
}
