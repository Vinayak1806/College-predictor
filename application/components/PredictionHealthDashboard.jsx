"use client";

import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  RefreshCw,
  ShieldCheck
} from "lucide-react";
import { useEffect, useState } from "react";

function Metric({ label, value, note }) {
  return (
    <div className="border-r border-line px-4 py-4 last:border-r-0">
      <dt className="text-xs uppercase text-slate-500">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold text-ink">{value}</dd>
      <p className="mt-1 text-xs text-slate-500">{note}</p>
    </div>
  );
}

const causeLabels = {
  WITHIN_EXPECTED_RANGE: "Within expected range",
  VOLATILE_HISTORY: "Volatile cutoff history",
  LIMITED_SPECIAL_HISTORY: "Limited special-category history",
  SEAT_TYPE_CHANGED: "Applicable seat type changed",
  LATEST_YEAR_SHIFT: "Latest-year cutoff shift"
};

const breakdownLabels = {
  category: "Category",
  seatType: "Seat type",
  university: "University",
  branch: "Branch",
  capRound: "CAP round"
};

function BreakdownTable({ label, rows }) {
  if (!rows?.length) return null;

  return (
    <details className="border-t border-line first:border-t-0">
      <summary className="focus-ring cursor-pointer px-4 py-3 text-sm font-semibold text-action">
        {label} breakdown
      </summary>
      <div className="overflow-x-auto border-t border-line">
        <table className="w-full min-w-[620px] border-collapse text-left text-xs">
          <thead className="bg-panel uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">{label}</th>
              <th className="px-3 py-2 font-medium">Samples</th>
              <th className="px-3 py-2 font-medium">Exact zone</th>
              <th className="px-3 py-2 font-medium">Within one zone</th>
              <th className="px-3 py-2 font-medium">Mean error</th>
              <th className="px-3 py-2 font-medium">Large errors</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr key={row.value}>
                <td className="max-w-xs break-words px-3 py-2 font-medium text-ink">{row.value}</td>
                <td className="px-3 py-2 text-slate-600">{row.samples}</td>
                <td className="px-3 py-2 text-slate-600">{row.exactZoneAccuracy}%</td>
                <td className="px-3 py-2 text-slate-600">{row.adjacentZoneAccuracy}%</td>
                <td className="px-3 py-2 font-semibold text-ink">{row.meanAbsoluteError.toFixed(2)}</td>
                <td className="px-3 py-2 text-slate-600">{row.largeErrors}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

export function PredictionHealthDashboard() {
  const [admissionRoute, setAdmissionRoute] = useState("FE");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadReport(route = admissionRoute) {
    setLoading(true);
    setError("");
    setReport(null);

    try {
      const response = await fetch(`/api/admin/prediction-health?route=${route}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || data.error || "Could not run the backtest.");
      setReport(data);
    } catch (loadError) {
      setError(loadError.message || "Could not run the prediction backtest.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReport(admissionRoute);
  }, [admissionRoute]);

  if (loading && !report) {
    return (
      <section className="rounded-lg border border-line bg-white p-8 text-center">
        <RefreshCw aria-hidden="true" className="mx-auto animate-spin text-action" size={24} />
        <p className="mt-3 font-semibold text-ink">Backtesting prediction logic...</p>
        <p className="mt-1 text-sm text-slate-500">Earlier cutoffs are being checked against the held-out latest year.</p>
      </section>
    );
  }

  if (error && !report) {
    return (
      <section className="rounded-lg border border-danger bg-white p-5 text-danger" role="alert">
        <div className="flex items-start gap-3">
          <AlertCircle aria-hidden="true" className="mt-0.5 shrink-0" size={19} />
          <div>
            <p className="font-semibold">Prediction health check failed</p>
            <p className="mt-1 text-sm">{error}</p>
            <button className="focus-ring mt-4 min-h-11 rounded border border-danger px-4 text-sm font-semibold" type="button" onClick={() => loadReport(admissionRoute)}>
              Run again
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="surface-card overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4 p-4 md:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-cyan-50 text-action">
            <ShieldCheck aria-hidden="true" size={21} />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase text-action">Prediction Health</p>
            <h2 className="mt-1 text-xl font-semibold text-ink">{admissionRoute} historical cutoff backtest</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{report.methodology.description}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="inline-grid min-h-11 grid-cols-2 overflow-hidden rounded border border-line" aria-label="Backtest admission route">
            {["FE", "DSE"].map((route) => (
              <button
                key={route}
                className={`focus-ring min-h-11 px-4 text-sm font-semibold ${admissionRoute === route ? "bg-action text-white" : "bg-white text-slate-700"}`}
                type="button"
                aria-pressed={admissionRoute === route}
                onClick={() => setAdmissionRoute(route)}
              >
                {route}
              </button>
            ))}
          </div>
          <button
            className="focus-ring flex min-h-11 items-center gap-2 rounded border border-line px-4 text-sm font-semibold text-slate-700 hover:bg-panel disabled:opacity-50"
            type="button"
            disabled={loading}
            onClick={() => loadReport(admissionRoute)}
          >
            <RefreshCw aria-hidden="true" className={loading ? "animate-spin" : ""} size={17} />
            Run again
          </button>
        </div>
      </div>

      <dl className="grid border-y border-line bg-panel sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Options tested" value={report.summary.testedOptions.toLocaleString("en-IN")} note={`${report.summary.testedProfiles} student profiles`} />
        <Metric label="Exact admission zone" value={`${report.summary.exactZoneAccuracy}%`} note="Same zone in held-out year" />
        <Metric label="Within one zone" value={`${report.summary.adjacentZoneAccuracy}%`} note="Exact or neighboring zone" />
        <Metric label="Mean cutoff error" value={report.summary.meanAbsoluteError.toFixed(2)} note={admissionRoute === "DSE" ? "Diploma percentage points" : "Percentile points"} />
      </dl>

      <div className="p-4 md:p-5">
        <div className="overflow-x-auto rounded border border-line">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead className="bg-panel text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-3 font-medium">Student profile</th>
                <th className="px-3 py-3 font-medium">{admissionRoute === "DSE" ? "Diploma %" : "Percentile"}</th>
                <th className="px-3 py-3 font-medium">Options tested</th>
                <th className="px-3 py-3 font-medium">Exact zone</th>
                <th className="px-3 py-3 font-medium">Within one zone</th>
                <th className="px-3 py-3 font-medium">Cutoff error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {report.profiles.map((profile) => (
                <tr key={profile.id}>
                  <td className="px-3 py-3 font-medium text-ink">{profile.label}</td>
                  <td className="px-3 py-3 text-slate-600">{Number(profile.score ?? profile.percentile ?? profile.diplomaPercentage).toFixed(2)}</td>
                  <td className="px-3 py-3 text-slate-600">{profile.testedOptions}</td>
                  <td className="px-3 py-3 text-slate-600">{profile.exactZoneAccuracy}%</td>
                  <td className="px-3 py-3 font-semibold text-ink">{profile.adjacentZoneAccuracy}%</td>
                  <td className="px-3 py-3 text-slate-600">{profile.meanAbsoluteError.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div className="rounded border border-line">
            <div className="border-b border-line bg-panel px-4 py-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Likely error causes</p>
              <p className="mt-1 text-xs text-slate-600">
                {report.summary.largeErrors} options moved at least 4 {admissionRoute === "DSE" ? "percentage" : "percentile"} points. Selected records with eligibility conflicts: {report.summary.eligibilityConflicts}.
              </p>
            </div>
            <dl className="divide-y divide-line">
              {Object.entries(report.likelyCauses || {}).map(([cause, count]) => (
                <div key={cause} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <dt className="text-slate-700">{causeLabels[cause] || cause}</dt>
                  <dd className="font-semibold text-ink">{count}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="overflow-hidden rounded border border-line">
            <div className="bg-panel px-4 py-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Where errors are highest</p>
              <p className="mt-1 text-xs text-slate-600">Groups need at least 10 comparable options. Highest mean errors appear first.</p>
            </div>
            {Object.entries(report.breakdowns || {}).map(([dimension, rows]) => (
              <BreakdownTable key={dimension} label={breakdownLabels[dimension] || dimension} rows={rows} />
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {report.unavailableProfiles.map((profile) => (
            <div key={profile.label} className="flex items-start gap-3 rounded border border-warning bg-amber-50 p-3">
              <Clock3 aria-hidden="true" className="mt-0.5 shrink-0 text-warning" size={18} />
              <div>
                <p className="text-sm font-semibold text-ink">{profile.label}</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">{profile.reason}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-start gap-3 border-t border-line pt-4 text-sm text-slate-600">
          <CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0 text-success" size={18} />
          <p>
            This checks historical cutoff behavior, not individual CAP allotment outcomes. It helps us find unstable prediction logic without presenting an unofficial guarantee to students.
          </p>
        </div>
      </div>
    </section>
  );
}
