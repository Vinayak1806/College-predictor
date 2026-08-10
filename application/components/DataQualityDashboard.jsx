"use client";

import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  RefreshCw,
  Search,
  ShieldAlert
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const severityStyles = {
  CRITICAL: "border-danger bg-red-50 text-danger",
  WARNING: "border-warning bg-amber-50 text-warning",
  INFO: "border-action bg-cyan-50 text-action"
};

const severityIcons = {
  CRITICAL: ShieldAlert,
  WARNING: AlertTriangle,
  INFO: AlertCircle
};

const filters = ["ALL", "CRITICAL", "WARNING", "INFO"];

export function DataQualityDashboard() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [severity, setSeverity] = useState("ALL");
  const [query, setQuery] = useState("");

  async function loadReport() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/data-quality", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || data.error || "Could not load the report.");
      setReport(data);
    } catch (loadError) {
      setError(loadError.message || "Could not load the data-quality report.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReport();
  }, []);

  const visibleIssues = useMemo(() => {
    if (!report) return [];
    const search = query.trim().toLowerCase();

    return report.issues
      .filter((issue) => severity === "ALL" || issue.severity === severity)
      .map((issue) => ({
        ...issue,
        records: search
          ? issue.records.filter((record) =>
              [record.instituteCode, record.name, record.city, record.value]
                .some((value) => String(value || "").toLowerCase().includes(search))
            )
          : issue.records
      }))
      .filter((issue) => !search || issue.records.length > 0 || issue.title.toLowerCase().includes(search));
  }, [query, report, severity]);

  function downloadIssueCsv() {
    const rows = [["severity", "issue", "institute_code", "college_or_record", "city", "problem"]];
    for (const qualityIssue of visibleIssues) {
      for (const affectedRecord of qualityIssue.records) {
        rows.push([
          qualityIssue.severity,
          qualityIssue.title,
          affectedRecord.instituteCode || "",
          affectedRecord.name || "",
          affectedRecord.city || "",
          affectedRecord.value || ""
        ]);
      }
    }

    const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `cap-data-quality-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (loading && !report) {
    return (
      <div className="rounded-lg border border-line bg-white p-10 text-center">
        <RefreshCw aria-hidden="true" className="mx-auto animate-spin text-action" size={24} />
        <p className="mt-3 font-semibold text-ink">Checking PostgreSQL records...</p>
        <p className="mt-1 text-sm text-slate-500">Calculating current-college coverage and validation issues.</p>
      </div>
    );
  }

  if (error && !report) {
    return (
      <div className="rounded-lg border border-danger bg-white p-5 text-danger" role="alert">
        <div className="flex items-start gap-3">
          <AlertCircle aria-hidden="true" className="mt-0.5 shrink-0" size={19} />
          <div>
            <p className="font-semibold">Data-quality report failed</p>
            <p className="mt-1 text-sm">{error}</p>
            <button className="focus-ring mt-4 min-h-11 rounded border border-danger px-4 text-sm font-semibold" type="button" onClick={loadReport}>
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <section className="surface-card overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4 p-4 md:p-5">
          <div>
            <p className="text-xs font-semibold uppercase text-action">Live database audit</p>
            <h2 className="mt-1 text-xl font-semibold text-ink">Coverage overview</h2>
            <p className="mt-1 text-sm text-slate-600">
              {report.summary.activeColleges} current CAP institutes checked against published records.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="focus-ring flex min-h-11 items-center gap-2 rounded border border-line bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-panel disabled:opacity-50"
              type="button"
              disabled={!visibleIssues.length}
              onClick={downloadIssueCsv}
            >
              <Download aria-hidden="true" size={17} /> Download issue CSV
            </button>
            <button
              className="focus-ring flex min-h-11 items-center gap-2 rounded border border-line bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-panel disabled:opacity-50"
              type="button"
              disabled={loading}
              onClick={loadReport}
            >
              <RefreshCw aria-hidden="true" className={loading ? "animate-spin" : ""} size={17} />
              Refresh audit
            </button>
          </div>
        </div>

        <dl className="grid grid-cols-2 border-y border-line bg-panel lg:grid-cols-4">
          <div className="border-b border-r border-line px-4 py-4 lg:border-b-0">
            <dt className="text-xs uppercase text-slate-500">Current institutes</dt>
            <dd className="mt-1 text-2xl font-semibold text-ink">{report.summary.activeColleges}</dd>
          </div>
          <div className="border-b border-line px-4 py-4 lg:border-b-0 lg:border-r">
            <dt className="text-xs uppercase text-slate-500">Published datasets</dt>
            <dd className="mt-1 text-2xl font-semibold text-ink">{report.summary.publishedDatasets}</dd>
          </div>
          <div className="border-r border-line px-4 py-4">
            <dt className="text-xs uppercase text-slate-500">Critical records</dt>
            <dd className="mt-1 text-2xl font-semibold text-danger">{report.summary.criticalCount}</dd>
          </div>
          <div className="px-4 py-4">
            <dt className="text-xs uppercase text-slate-500">Warning records</dt>
            <dd className="mt-1 text-2xl font-semibold text-warning">{report.summary.warningCount}</dd>
          </div>
        </dl>

        <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-5 md:p-5">
          {report.coverage.map((item) => (
            <div key={item.id} className="min-w-0">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-slate-700">{item.label}</p>
                <p className="shrink-0 font-semibold text-ink">{item.percent}%</p>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded bg-slate-100">
                <div
                  className={item.percent >= 90 ? "h-full bg-success" : item.percent >= 70 ? "h-full bg-warning" : "h-full bg-danger"}
                  style={{ width: `${item.percent}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">{item.covered} of {item.total}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="surface-card overflow-hidden">
        <div className="grid gap-4 border-b border-line p-4 md:grid-cols-[1fr_auto] md:items-end md:p-5">
          <div>
            <p className="text-xs font-semibold uppercase text-action">Action queue</p>
            <h2 className="mt-1 text-xl font-semibold text-ink">{report.summary.issueGroups} issue groups</h2>
            <p className="mt-1 text-sm text-slate-600">Critical mapping errors come before optional research-data gaps.</p>
          </div>
          <div className="flex flex-wrap gap-2" aria-label="Issue severity filters">
            {filters.map((filter) => (
              <button
                key={filter}
                className={`focus-ring min-h-11 rounded border px-3 text-sm font-semibold ${
                  severity === filter ? "border-action bg-action text-white" : "border-line bg-white text-slate-700"
                }`}
                type="button"
                onClick={() => setSeverity(filter)}
              >
                {filter === "ALL" ? "All" : filter === "CRITICAL" ? "Critical" : filter === "WARNING" ? "Warning" : "Information"}
              </button>
            ))}
          </div>
        </div>

        <div className="border-b border-line p-4 md:px-5">
          <label className="flex min-h-11 items-center gap-3 rounded border border-line bg-white px-3 focus-within:ring-2 focus-within:ring-[#7db9ca]">
            <Search aria-hidden="true" className="shrink-0 text-slate-400" size={18} />
            <span className="sr-only">Search affected records</span>
            <input
              className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm outline-none"
              placeholder="Search institute code, college, city or problem"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </div>

        <div className="divide-y divide-line">
          {visibleIssues.map((qualityIssue) => {
            const SeverityIcon = severityIcons[qualityIssue.severity];

            return (
              <details key={qualityIssue.id} className="group" open={qualityIssue.severity === "CRITICAL" && !query}>
                <summary className="focus-ring flex cursor-pointer list-none items-start justify-between gap-4 px-4 py-4 md:px-5">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded border ${severityStyles[qualityIssue.severity]}`}>
                      <SeverityIcon aria-hidden="true" size={18} />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-ink">{qualityIssue.title}</h3>
                        <span className={`rounded border px-2 py-0.5 text-xs font-semibold ${severityStyles[qualityIssue.severity]}`}>
                          {qualityIssue.severity === "INFO" ? "Information" : qualityIssue.severity.toLowerCase()}
                        </span>
                      </div>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{qualityIssue.description}</p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded bg-panel px-3 py-2 text-sm font-semibold text-ink">{qualityIssue.count}</span>
                </summary>

                <div className="border-t border-line bg-panel px-4 py-4 md:px-5">
                  {qualityIssue.records.length ? (
                    <div className="overflow-hidden rounded border border-line bg-white">
                      <div className="hidden grid-cols-[110px_minmax(0,1.5fr)_minmax(120px,0.6fr)_minmax(180px,1fr)] gap-3 border-b border-line px-3 py-2 text-xs font-medium uppercase text-slate-500 md:grid">
                        <span>Code</span>
                        <span>College or record</span>
                        <span>City</span>
                        <span>Problem</span>
                      </div>
                      <div className="divide-y divide-line">
                        {qualityIssue.records.map((affectedRecord, index) => (
                          <div
                            key={`${qualityIssue.id}-${affectedRecord.instituteCode}-${affectedRecord.name}-${index}`}
                            className="grid gap-1 px-3 py-3 text-sm md:grid-cols-[110px_minmax(0,1.5fr)_minmax(120px,0.6fr)_minmax(180px,1fr)] md:gap-3"
                          >
                            <p className="font-mono text-xs font-semibold text-action">{affectedRecord.instituteCode || "-"}</p>
                            <p className="font-medium text-ink">{affectedRecord.name}</p>
                            <p className="text-slate-600">{affectedRecord.city || "-"}</p>
                            <p className="text-slate-600">{affectedRecord.value || "-"}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-600">No sampled record matches the current search.</p>
                  )}
                  {query && qualityIssue.records.length ? (
                    <p className="mt-2 text-xs text-slate-500">
                      Showing {qualityIssue.records.length} matching record{qualityIssue.records.length === 1 ? "" : "s"} from {qualityIssue.count} total.
                    </p>
                  ) : qualityIssue.count > qualityIssue.records.length ? (
                    <p className="mt-2 text-xs text-slate-500">
                      Showing {qualityIssue.records.length} sampled records from {qualityIssue.count} total.
                    </p>
                  ) : null}
                </div>
              </details>
            );
          })}

          {!visibleIssues.length ? (
            <div className="px-5 py-10 text-center">
              <CheckCircle2 aria-hidden="true" className="mx-auto text-success" size={26} />
              <p className="mt-3 font-semibold text-ink">No matching issues</p>
              <p className="mt-1 text-sm text-slate-500">Change the severity filter or search text.</p>
            </div>
          ) : null}
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <p className="inline-flex items-center gap-2"><Database aria-hidden="true" size={14} /> Live PostgreSQL report</p>
        <p>Generated {new Date(report.generatedAt).toLocaleString("en-IN")}</p>
      </div>
    </div>
  );
}
