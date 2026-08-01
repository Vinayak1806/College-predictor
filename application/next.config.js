import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

export default function nextConfig(phase) {
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
    `script-src 'self' 'unsafe-inline'${development ? " 'unsafe-eval'" : ""}`,
    `connect-src 'self'${development ? " ws: wss:" : ""}`,
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
