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

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "localhost:3001"],
    },
  },
  outputFileTracingIncludes: {
    "/*": ["./prisma/dev.db"],
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
