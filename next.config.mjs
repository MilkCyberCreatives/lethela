function toRemotePattern(value, defaultPathname = "/**") {
  if (!value) return null;

  try {
    const url = new URL(value);
    const pathname =
      url.pathname && url.pathname !== "/"
        ? `${url.pathname.replace(/\/+$/, "")}/**`
        : defaultPathname;

    return {
      protocol: url.protocol.replace(":", ""),
      hostname: url.hostname,
      port: url.port || undefined,
      pathname,
    };
  } catch {
    return null;
  }
}

const configuredRemotePatterns = [
  toRemotePattern(process.env.NEXT_PUBLIC_SITE_URL),
  toRemotePattern(process.env.STORAGE_BUCKET_URL),
  toRemotePattern(process.env.SUPABASE_URL, "/storage/v1/object/public/**"),
].filter(Boolean);

function originHost(value) {
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.host;
  } catch {
    return null;
  }
}

const allowedServerActionOrigins = Array.from(
  new Set(
    [
      "localhost:3000",
      "localhost:3001",
      originHost(process.env.NEXT_PUBLIC_SITE_URL),
      originHost(process.env.NEXTAUTH_URL),
      process.env.VERCEL_URL || null,
    ].filter(Boolean),
  ),
);

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self' https://*.ozow.com",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""} https://www.googletagmanager.com https://www.google-analytics.com https://js.sentry-cdn.com https://maps.googleapis.com https://maps.gstatic.com https://js.pusher.com https://va.vercel-scripts.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https: wss:",
  "frame-src 'self' https://*.ozow.com https://*.google.com",
  "worker-src 'self' blob:",
  process.env.NODE_ENV === "production" ? "upgrade-insecure-requests" : "",
]
  .filter(Boolean)
  .join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(self), payment=(self), usb=(), interest-cohort=(), geolocation=(self)",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
          },
        ],
      },
    ];
  },
  experimental: {
    serverActions: {
      allowedOrigins: allowedServerActionOrigins,
    },
  },
  images: {
    remotePatterns: configuredRemotePatterns,
  },
  webpack: (config) => {
    config.ignoreWarnings = [
      ...(config.ignoreWarnings ?? []),
      {
        module: /@opentelemetry\/instrumentation/,
        message: /Critical dependency: the request of a dependency is an expression/,
      },
    ];

    return config;
  },
};

export default nextConfig;
