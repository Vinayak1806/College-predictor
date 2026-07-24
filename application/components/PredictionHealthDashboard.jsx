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

export function PredictionHealthDashboard() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadReport() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/prediction-health", { cache: "no-store" });
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
    loadReport();
  }, []);

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
            <button className="focus-ring mt-4 min-h-11 rounded border border-danger px-4 text-sm font-semibold" type="button" onClick={loadReport}>
              Run again
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-lg border border-line bg-white">
      <div className="flex flex-wrap items-start justify-between gap-4 p-4 md:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-cyan-50 text-action">
            <ShieldCheck aria-hidden="true" size={21} />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase text-action">Prediction Health</p>
            <h2 className="mt-1 text-xl font-semibold text-ink">Historical cutoff backtest</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{report.methodology.description}</p>
          </div>
        </div>
        <button
          className="focus-ring flex min-h-11 items-center gap-2 rounded border border-line px-4 text-sm font-semibold text-slate-700 hover:bg-panel disabled:opacity-50"
          type="button"
          disabled={loading}
          onClick={loadReport}
        >
          <RefreshCw aria-hidden="true" className={loading ? "animate-spin" : ""} size={17} />
          Run backtest
        </button>
      </div>

      <dl className="grid border-y border-line bg-panel sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Options tested" value={report.summary.testedOptions.toLocaleString("en-IN")} note={`${report.summary.testedProfiles} student profiles`} />
        <Metric label="Exact admission zone" value={`${report.summary.exactZoneAccuracy}%`} note="Same zone in held-out year" />
        <Metric label="Within one zone" value={`${report.summary.adjacentZoneAccuracy}%`} note="Exact or neighboring zone" />
        <Metric label="Mean cutoff error" value={report.summary.meanAbsoluteError.toFixed(2)} note="Percentile points" />
      </dl>

      <div className="p-4 md:p-5">
        <div className="overflow-x-auto rounded border border-line">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead className="bg-panel text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-3 font-medium">Student profile</th>
                <th className="px-3 py-3 font-medium">Percentile</th>
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
                  <td className="px-3 py-3 text-slate-600">{profile.percentile.toFixed(2)}</td>
                  <td className="px-3 py-3 text-slate-600">{profile.testedOptions}</td>
                  <td className="px-3 py-3 text-slate-600">{profile.exactZoneAccuracy}%</td>
                  <td className="px-3 py-3 font-semibold text-ink">{profile.adjacentZoneAccuracy}%</td>
                  <td className="px-3 py-3 text-slate-600">{profile.meanAbsoluteError.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
