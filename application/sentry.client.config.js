import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN,

  // Performance monitoring — keep low to stay within free-tier limits
  tracesSampleRate: 0.1,

  // Session replay for error reproduction
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration()
  ],

  // Release tracking — uses the same RELEASE_ID as the rest of the app
  release: process.env.NEXT_PUBLIC_RELEASE_ID || undefined,

  // Don't send errors in development
  enabled: process.env.NODE_ENV === "production",

  // Ignore benign client-aborted streams and connection resets
  ignoreErrors: [
    "transformAlgorithm is not a function",
    "The operation was aborted",
    "AbortError",
    "ResizeObserver loop completed with undelivered notifications."
  ],

  beforeSend(event, hint) {
    const error = hint?.originalException;
    if (error && typeof error === "object") {
      const message = String(error.message || "");
      if (message.includes("transformAlgorithm") || error.name === "AbortError") {
        return null;
      }
    }
    return event;
  }
});
