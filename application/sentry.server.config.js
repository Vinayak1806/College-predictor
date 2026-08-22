import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Performance monitoring — keep low to stay within free-tier limits
  tracesSampleRate: 0.1,

  // Release tracking
  release: process.env.RELEASE_ID || undefined,

  // Don't send errors in development
  enabled: process.env.NODE_ENV === "production",

  // Ignore benign client-aborted streams and connection resets
  ignoreErrors: [
    "transformAlgorithm is not a function",
    "The operation was aborted",
    "AbortError",
    "ECONNRESET",
    "EPIPE"
  ],

  beforeSend(event, hint) {
    const error = hint?.originalException;
    if (error && typeof error === "object") {
      const message = String(error.message || "");
      const stack = String(error.stack || "");
      if (
        message.includes("transformAlgorithm") ||
        stack.includes("transformStreamDefaultControllerPerformTransform") ||
        message.includes("The operation was aborted") ||
        error.name === "AbortError"
      ) {
        return null; // Drop benign client abort error from Sentry
      }
    }
    return event;
  }
});
