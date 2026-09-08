import { NextResponse } from "next/server";

// The VAPID public key is already public (it ships in the client bundle as
// NEXT_PUBLIC_VAPID_PUBLIC_KEY). The service worker reads it from here when it
// needs to re-subscribe after the browser rotates a push subscription.
export function GET() {
  const publicKey =
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ||
    process.env.WEB_PUSH_VAPID_PUBLIC_KEY?.trim() ||
    "";

  return NextResponse.json({ publicKey }, { headers: { "cache-control": "public, max-age=300" } });
}
