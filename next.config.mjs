/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /** Hide framework fingerprint on responses */
  poweredByHeader: false,
  experimental: {
    instrumentationHook: true,
    // yahoo-finance2 pulls @deno/shim-deno (Node `net`). Keep it external so
    // webpack does not try to bundle it into instrumentation / server graphs.
    serverComponentsExternalPackages: ["yahoo-finance2"],
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Instrumentation is not covered by serverComponentsExternalPackages alone.
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
