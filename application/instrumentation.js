/**
 * Next.js instrumentation hook — loads Sentry on server startup.
 * See: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config.js");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config.js");
  }
}

export const onRequestError = (...args) => {
  // Dynamic import to avoid bundling Sentry in environments where it's not configured
  import("@sentry/nextjs").then((Sentry) => {
    Sentry.captureRequestError?.(...args);
  }).catch(() => {
    // Sentry not available — silently ignore
  });
};
