import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Performance monitoring
  tracesSampleRate: 0.1,

  // Release tracking
  release: process.env.RELEASE_ID || undefined,

  // Don't send errors in development
  enabled: process.env.NODE_ENV === "production"
});
