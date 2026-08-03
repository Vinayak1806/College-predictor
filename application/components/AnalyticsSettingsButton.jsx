"use client";

import { resetAnalyticsConsent } from "./GoogleAnalytics";

export function AnalyticsSettingsButton() {
  return (
    <button className="text-left hover:text-white" type="button" onClick={resetAnalyticsConsent}>
      Analytics settings
    </button>
  );
}
