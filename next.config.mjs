/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /** Hide framework fingerprint on responses */
  poweredByHeader: false,
  experimental: {
    instrumentationHook: true,
    // Keep Node-only drivers out of the instrumentation / server webpack graph.
    serverComponentsExternalPackages: [
      "yahoo-finance2",
      "@neondatabase/serverless",
      "@prisma/adapter-neon",
      "ws",
    ],
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Instrumentation is not covered by serverComponentsExternalPackages alone.
      // Scoped npm packages must not be listed as bare webpack externals (@ breaks
      // the concat parser). Rely on serverComponentsExternalPackages for those.
      const prev = config.externals;
      config.externals = [
        ...(Array.isArray(prev) ? prev : prev ? [prev] : []),
        "yahoo-finance2",
      ];
    }
    return config;
  },
  images: {
    // Any HTTPS image URL (e.g. broker icons, avatars). Tighten remotePatterns
    // to known hostnames in production if you do not need arbitrary URLs.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
