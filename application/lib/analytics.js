const EVENT_NAME_PATTERN = /^[a-z][a-z0-9_]{1,39}$/;

export function trackAnalyticsEvent(eventName, parameters = {}) {
  if (
    typeof window === "undefined" ||
    typeof window.gtag !== "function" ||
    !EVENT_NAME_PATTERN.test(eventName)
  ) {
    return false;
  }

  const safeParameters = Object.fromEntries(
    Object.entries(parameters).filter(([, value]) =>
      ["string", "number", "boolean"].includes(typeof value)
    )
  );

  window.gtag("event", eventName, safeParameters);
  return true;
}
