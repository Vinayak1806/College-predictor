import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";
import { withSentryConfig } from "@sentry/nextjs";

function createNextConfig(phase) {
  const development = phase === PHASE_DEVELOPMENT_SERVER;
  const secureDeployment = !development && (
    process.env.SECURE_DEPLOYMENT === "true" || process.env.VERCEL === "1"
  );
  const contentSecurityPolicy = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    `script-src 'self' 'unsafe-inline' https://www.googletagmanager.com${development ? " 'unsafe-eval'" : ""}`,
    `connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://*.ingest.sentry.io${development ? " ws: wss:" : ""}`,
    ...(secureDeployment ? ["upgrade-insecure-requests"] : [])
  ].join("; ");

  const securityHeaders = [
    { key: "Content-Security-Policy", value: contentSecurityPolicy },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" }
  ];

  if (secureDeployment) {
    securityHeaders.push({
      key: "Strict-Transport-Security",
      value: "max-age=31536000; includeSubDomains"
    });
  }

  return {
    distDir: development ? ".next-dev" : ".next",
    poweredByHeader: false,
    async headers() {
      return [{ source: "/:path*", headers: securityHeaders }];
    }
  };
}

// Wrap with Sentry only when a DSN is configured (avoids build errors
// when Sentry env vars are not yet set up during local development).
export default function nextConfig(phase) {
  const config = createNextConfig(phase);

  if (!process.env.SENTRY_DSN && !process.env.NEXT_PUBLIC_SENTRY_DSN) {
    return config;
  }

  return withSentryConfig(config, {
    // Upload source maps for readable stack traces in Sentry
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    authToken: process.env.SENTRY_AUTH_TOKEN,

    // Suppress source map upload logs during build
    silent: !process.env.CI,

    // Automatically tree-shake Sentry logger in production
    disableLogger: true,

    // Hide source maps from the client bundle
    hideSourceMaps: true,

    // Tunnel Sentry events through a Next.js route to avoid ad-blockers
    // (optional — uncomment if you want to set up a tunnel route)
    // tunnelRoute: "/monitoring"
  });
}

