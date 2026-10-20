import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Public and harmless: says which commit the live site was built from, so a check can
// confirm a deploy reached the domain. It holds no secrets and touches no data.
export function GET() {
  const commit = process.env.VERCEL_GIT_COMMIT_SHA?.trim() || null;
  return NextResponse.json(
    {
      ok: true,
      commit,
      shortCommit: commit ? commit.slice(0, 7) : null,
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || null,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
