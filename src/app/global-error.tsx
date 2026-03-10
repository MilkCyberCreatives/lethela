// /src/app/global-error.tsx
"use client";

import * as Sentry from "@sentry/nextjs";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  Sentry.captureException(error);

  return (
    <html>
      <body className="min-h-dvh bg-lethela-secondary text-white">
        <div className="container py-20">
          <h1 className="text-2xl font-bold">Something went wrong</h1>
          <p className="mt-2 text-white/70">We have logged the error. Please try again.</p>
          {error?.digest ? (
            <p className="mt-2 text-xs text-white/50">Error id: {error.digest}</p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
