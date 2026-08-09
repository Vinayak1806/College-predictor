"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";
import { trackAnalyticsEvent } from "../lib/analytics";

export function SharePageButton({ title = "Admission Compass college", label = "Share college" }) {
  const [copied, setCopied] = useState(false);

  async function sharePage() {
    const data = { title, url: window.location.href };

    try {
      if (navigator.share) {
        await navigator.share(data);
      } else {
        await navigator.clipboard.writeText(data.url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2200);
      }
      trackAnalyticsEvent("college_shared");
    } catch (error) {
      if (error?.name !== "AbortError") setCopied(false);
    }
  }

  return (
    <button
      className="focus-ring inline-flex min-h-11 items-center gap-2 rounded border border-line bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-panel"
      type="button"
      onClick={sharePage}
    >
      {copied ? <Check aria-hidden="true" size={17} /> : <Share2 aria-hidden="true" size={17} />}
      {copied ? "Link copied" : label}
    </button>
  );
}
