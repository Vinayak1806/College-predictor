"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useState } from "react";

const CONSENT_KEY = "cap-predictor-analytics-consent";
const RESET_EVENT = "cap-analytics-consent-reset";

function validMeasurementId(value) {
  return /^G-[A-Z0-9]+$/i.test(value || "") ? value : null;
}

export function resetAnalyticsConsent() {
  window.localStorage.removeItem(CONSENT_KEY);
  window.dispatchEvent(new Event(RESET_EVENT));
}

export function GoogleAnalytics({ measurementId: configuredId }) {
  const measurementId = validMeasurementId(configuredId);
  const enabled = process.env.NODE_ENV === "production" && Boolean(measurementId);
  const [consent, setConsent] = useState(null);

  useEffect(() => {
    if (!enabled) return undefined;

    setConsent(window.localStorage.getItem(CONSENT_KEY));
    const reset = () => setConsent(null);
    window.addEventListener(RESET_EVENT, reset);
    return () => window.removeEventListener(RESET_EVENT, reset);
  }, [enabled]);

  function choose(value) {
    window.localStorage.setItem(CONSENT_KEY, value);
    setConsent(value);
  }

  if (!enabled) return null;

  return (
    <>
      {consent === "granted" ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${measurementId}', { anonymize_ip: true });`}
          </Script>
        </>
      ) : null}

      {consent === null ? (
        <aside className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-white shadow-[0_-8px_24px_rgba(15,23,42,0.12)]" aria-label="Analytics choice">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-3xl text-sm leading-6 text-slate-700">
              We use optional Google Analytics to understand which tools are useful. We do not send percentile, category, gender, merit number or email. Read our{" "}
              <Link className="font-semibold text-action underline" href="/privacy">privacy policy</Link>.
            </p>
            <div className="flex shrink-0 gap-2">
              <button className="focus-ring min-h-11 rounded border border-line px-4 text-sm font-semibold text-slate-700" type="button" onClick={() => choose("denied")}>Decline</button>
              <button className="focus-ring min-h-11 rounded bg-action px-4 text-sm font-semibold text-white" type="button" onClick={() => choose("granted")}>Accept analytics</button>
            </div>
          </div>
        </aside>
      ) : null}
    </>
  );
}
