"use client";

import Link from "next/link";
import { FileDown, LockKeyhole } from "lucide-react";
import { useState } from "react";
import { authClient } from "../lib/authClient";

export function PredictionReportButton({ route, form, results, totalResults }) {
  const { data: session, isPending } = authClient.useSession();
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const callbackURL = route === "DSE" ? "/dse-predictor" : "/fe-predictor";

  if (!session?.user) {
    return (
      <Link
        className="focus-ring inline-flex min-h-11 items-center gap-2 rounded border border-action bg-white px-4 text-sm font-semibold text-action"
        href={`/login?callbackURL=${encodeURIComponent(callbackURL)}`}
        aria-disabled={isPending}
      >
        <LockKeyhole aria-hidden="true" size={16} /> Sign in for report
      </Link>
    );
  }

  async function downloadReport() {
    setDownloading(true);
    setError("");
    try {
      const profile = route === "DSE" ? {
        "Diploma percentage": form.diplomaPercentage,
        Category: form.category,
        Gender: form.gender,
        "Diploma branch": form.diplomaBranch,
        "Preferred branches": form.branches?.join(", ") || "All branches",
        Location: form.cities?.join(", ") || "All Maharashtra"
      } : {
        Percentile: form.percentile,
        Category: form.category,
        Gender: form.gender,
        "Home university": form.homeUniversity,
        "Preferred branches": form.branches?.join(", ") || "All branches",
        Location: form.cities?.join(", ") || "All Maharashtra"
      };
      const response = await fetch("/api/prediction-reports/pdf", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ route, profile, totalResults, results })
      });
      const payload = response.headers.get("content-type")?.includes("application/json") ? await response.json() : null;
      if (!response.ok) throw new Error(payload?.error || "Could not create the prediction report.");

      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `cap-predictor-${route.toLowerCase()}-prediction.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(downloadError.message);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div>
      <button
        className="focus-ring inline-flex min-h-11 items-center gap-2 rounded border border-action bg-white px-4 text-sm font-semibold text-action disabled:opacity-50"
        type="button"
        disabled={downloading || !results.length}
        onClick={downloadReport}
      >
        <FileDown aria-hidden="true" size={16} /> {downloading ? "Creating report..." : "Download my report"}
      </button>
      {error ? <p className="mt-1 text-xs text-danger" role="alert">{error}</p> : null}
    </div>
  );
}
