// /src/app/error.tsx
"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="container py-16">
      <h1 className="text-xl font-bold">Page error</h1>
      <p className="mt-2 text-white/70">We’ve logged this and will look into it.</p>
      <button
        onClick={() => reset()}
        className="mt-4 rounded bg-lethela-primary px-4 py-2 font-semibold"
      >
        Try again
      </button>
    </div>
  );
}
