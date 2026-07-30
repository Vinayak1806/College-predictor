"use client";

import {
  AlertCircle,
  Ban,
  CheckCircle2,
  Clock3,
  Database,
  FileCheck2,
  FileText,
  Pencil,
  RefreshCw,
  RotateCcw,
  Save,
  Send,
  ShieldCheck,
  Upload
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

const documentTypes = [
  {
    value: "CUTOFF_PDF",
    label: "CAP cutoff",
    note: "Ranks, percentiles and seat types"
  },
  {
    value: "SEAT_MATRIX_PDF",
    label: "Seat matrix",
    note: "Branch intake and CAP seats"
  }
];

const statusStyles = {
  UPLOADED: "border-slate-300 bg-slate-50 text-slate-700",
  PROCESSING: "border-action bg-cyan-50 text-action",
  NEEDS_REVIEW: "border-warning bg-amber-50 text-warning",
  VERIFIED: "border-success bg-emerald-50 text-success",
  PUBLISHED: "border-success bg-emerald-50 text-success",
  REJECTED: "border-danger bg-red-50 text-danger",
  ROLLED_BACK: "border-slate-300 bg-slate-50 text-slate-700"
};

const statusLabels = {
  UPLOADED: "Uploaded",
  PROCESSING: "Processing",
  NEEDS_REVIEW: "Needs review",
  VERIFIED: "Verified",
  PUBLISHED: "Published",
  REJECTED: "Rejected",
  ROLLED_BACK: "Rolled back"
};

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return "-";
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex min-h-7 items-center rounded border px-2 text-xs font-semibold ${statusStyles[status] || statusStyles.UPLOADED}`}>
      {statusLabels[status] || status}
    </span>
  );
}

function Metric({ label, value, tone = "text-ink" }) {
  return (
    <div className="min-w-0 border-r border-line px-4 py-3 last:border-r-0">
      <dt className="text-xs uppercase text-slate-500">{label}</dt>
      <dd className={`mt-1 text-xl font-semibold ${tone}`}>{value ?? "-"}</dd>
    </div>
  );
}

const correctionFields = {
  CUTOFF: [
    ["institute_code", "Institute code"],
    ["branch_code", "Branch code"],
    ["college_name", "College name"],
    ["branch_name", "Branch name"],
    ["seat_type", "Seat type"],
    ["category", "Category"],
    ["gender", "Gender"],
    ["university_type", "University type"],
    ["closing_score", "Closing percentile"],
    ["closing_rank", "Closing rank"],
    ["source_page", "Source page"]
  ],
  SEAT_MATRIX: [
    ["institute_code", "Institute code"],
    ["branch_code", "Branch code"],
    ["college_name", "College name"],
    ["branch_name", "Branch name"],
    ["college_type", "College type"],
    ["autonomous", "Autonomous"],
    ["sanctioned_intake", "Approved intake"],
    ["cap_seats", "CAP seats"],
    ["ews_seats", "EWS seats"],
    ["tfws_seats", "TFWS seats"],
    ["source_page", "Source page"]
  ]
};

function RecordEditor({ record, working, onCancel, onSave }) {
  const [values, setValues] = useState(() =>
    Object.fromEntries(
      correctionFields[record.recordType].map(([field]) => [field, record.data[field] ?? ""])
    )
  );

  return (
    <form
      className="mt-4 border-t border-line bg-panel pt-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(values);
      }}
    >
      <p className="text-xs font-semibold uppercase text-action">Correct staged record</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {correctionFields[record.recordType].map(([field, label]) => (
          <label
            key={field}
            className={`grid gap-1 text-xs font-medium text-slate-700 ${
              ["college_name", "branch_name"].includes(field) ? "sm:col-span-2" : ""
            }`}
          >
            {label}
            {field === "autonomous" ? (
              <select
                className="focus-ring min-h-11 rounded border border-line px-3 text-sm"
                value={String(values[field])}
                onChange={(event) => setValues((current) => ({ ...current, [field]: event.target.value === "true" }))}
              >
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            ) : (
              <input
                className="focus-ring min-h-11 min-w-0 rounded border border-line px-3 text-sm"
                value={values[field]}
                onChange={(event) => setValues((current) => ({ ...current, [field]: event.target.value }))}
              />
            )}
          </label>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className="focus-ring inline-flex min-h-11 items-center gap-2 rounded bg-action px-4 text-sm font-semibold text-white disabled:opacity-60"
          type="submit"
          disabled={working}
        >
          {working ? <RefreshCw aria-hidden="true" className="animate-spin" size={16} /> : <Save aria-hidden="true" size={16} />}
          Save and validate
        </button>
        <button
          className="focus-ring min-h-11 rounded border border-line bg-white px-4 text-sm font-semibold text-slate-700"
          type="button"
          disabled={working}
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function RecordPreview({ record, canEdit, editing, working, onEdit, onCancel, onSave, onExclude }) {
  const data = record.data;
  const isCutoff = record.recordType === "CUTOFF";
  const excluded = !record.valid && !record.needsReview;

  return (
    <article className="border-t border-line px-4 py-3 first:border-t-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-xs font-semibold text-action">
            Row {record.rowNumber} | {data.institute_code || "No code"}
          </p>
          <p className="mt-1 break-words text-sm font-semibold text-ink">{data.college_name || "Unknown college"}</p>
          <p className="mt-1 break-words text-xs text-slate-600">
            {data.branch_name || "Unknown branch"} {data.branch_code ? `| ${data.branch_code}` : ""}
          </p>
        </div>
        <span className={`rounded border px-2 py-1 text-xs font-semibold ${
          record.needsReview
            ? "border-warning bg-amber-50 text-warning"
            : excluded
              ? "border-slate-300 bg-slate-50 text-slate-600"
              : "border-success bg-emerald-50 text-success"
        }`}>
          {record.needsReview ? "Review" : excluded ? "Excluded" : "Ready"}
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
        {isCutoff ? (
          <>
            <div><dt className="text-slate-500">Seat type</dt><dd className="font-semibold text-ink">{data.seat_type || "-"}</dd></div>
            <div><dt className="text-slate-500">Closing score</dt><dd className="font-semibold text-ink">{data.closing_score || "-"}</dd></div>
            <div><dt className="text-slate-500">Closing rank</dt><dd className="font-semibold text-ink">{data.closing_rank || "-"}</dd></div>
            <div><dt className="text-slate-500">Source page</dt><dd className="font-semibold text-ink">{data.source_page || "-"}</dd></div>
          </>
        ) : (
          <>
            <div><dt className="text-slate-500">Intake</dt><dd className="font-semibold text-ink">{data.sanctioned_intake || "-"}</dd></div>
            <div><dt className="text-slate-500">CAP seats</dt><dd className="font-semibold text-ink">{data.cap_seats || "-"}</dd></div>
            <div><dt className="text-slate-500">EWS seats</dt><dd className="font-semibold text-ink">{data.ews_seats || "-"}</dd></div>
            <div><dt className="text-slate-500">Source page</dt><dd className="font-semibold text-ink">{data.source_page || "-"}</dd></div>
          </>
        )}
      </dl>

      {record.issues?.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {record.issues.map((issue) => (
            <span key={issue} className="rounded border border-warning bg-amber-50 px-2 py-1 text-[11px] font-medium text-warning">
              {issue.replaceAll("_", " ").toLowerCase()}
            </span>
          ))}
        </div>
      ) : null}

      {canEdit && !editing ? (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
          <button
            className="focus-ring inline-flex min-h-10 items-center gap-2 rounded border border-line bg-white px-3 text-xs font-semibold text-slate-700"
            type="button"
            onClick={onEdit}
          >
            <Pencil aria-hidden="true" size={15} /> Correct row
          </button>
          {!excluded ? (
            <button
              className="focus-ring inline-flex min-h-10 items-center gap-2 rounded border border-danger bg-white px-3 text-xs font-semibold text-danger"
              type="button"
              disabled={working}
              onClick={onExclude}
            >
              <Ban aria-hidden="true" size={15} /> Exclude row
            </button>
          ) : null}
        </div>
      ) : null}

      {editing ? (
        <RecordEditor
          record={record}
          working={working}
          onCancel={onCancel}
          onSave={onSave}
        />
      ) : null}
    </article>
  );
}

export function AdminImportCentre() {
  const [form, setForm] = useState({
    documentType: "CUTOFF_PDF",
    admissionRoute: "FE",
    academicYear: "2026-27",
    capRound: "1",
    sourceUrl: ""
  });
  const [file, setFile] = useState(null);
  const [imports, setImports] = useState([]);
  const [selected, setSelected] = useState(null);
  const [recordFilter, setRecordFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");
  const [error, setError] = useState("");
  const [editingRecordId, setEditingRecordId] = useState("");
  const fileInputRef = useRef(null);

  async function api(url, options = {}) {
    const response = await fetch(url, {
      cache: "no-store",
      ...options,
      headers: { ...(options.headers || {}) }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "The admin request failed.");
    return data;
  }

  async function loadImports() {
    setLoading(true);
    setError("");
    try {
      const response = await api("/api/admin/imports");
      setImports(response.data);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadImport(id, filter = recordFilter) {
    setWorking(`preview-${id}`);
    setError("");
    try {
      const response = await api(`/api/admin/imports/${id}?records=${filter}`);
      setSelected(response.data);
      setEditingRecordId("");
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setWorking("");
    }
  }

  useEffect(() => {
    loadImports();
  }, []);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "documentType" && value === "SEAT_MATRIX_PDF"
        ? { capRound: "" }
        : {})
    }));
  }

  async function submitImport(event) {
    event.preventDefault();
    if (!file) {
      setError("Choose an official PDF file.");
      return;
    }

    setWorking("upload");
    setError("");
    const body = new FormData();
    Object.entries(form).forEach(([key, value]) => body.append(key, value));
    body.append("quota", "MH");
    body.append("file", file);

    try {
      const response = await api("/api/admin/imports", { method: "POST", body });
      setSelected(response.data);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadImports();
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setWorking("");
    }
  }

  async function runAction(action) {
    if (!selected) return;
    const confirmation = action === "publish"
      ? `Publish ${selected.summary?.publishableRecords || 0} validated records to the live database?`
      : "Roll back the records published by this import?";
    if (!window.confirm(confirmation)) return;

    setWorking(action);
    setError("");
    try {
      const response = await api(`/api/admin/imports/${selected.id}/${action}`, { method: "POST" });
      setSelected((current) => ({ ...current, ...response.data }));
      await loadImports();
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setWorking("");
    }
  }

  async function changeRecordFilter(filter) {
    setRecordFilter(filter);
    if (selected) await loadImport(selected.id, filter);
  }

  async function correctRecord(record, data) {
    if (!selected) return;
    setWorking(`record-${record.id}`);
    setError("");
    try {
      await api(`/api/admin/imports/${selected.id}/records/${record.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ data })
      });
      await Promise.all([loadImport(selected.id, recordFilter), loadImports()]);
    } catch (correctionError) {
      setError(correctionError.message);
    } finally {
      setWorking("");
    }
  }

  async function excludeRecord(record) {
    if (!selected || !window.confirm(`Exclude extracted row ${record.rowNumber} from publication?`)) return;
    setWorking(`record-${record.id}`);
    setError("");
    try {
      await api(`/api/admin/imports/${selected.id}/records/${record.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ exclude: true })
      });
      await Promise.all([loadImport(selected.id, recordFilter), loadImports()]);
    } catch (excludeError) {
      setError(excludeError.message);
    } finally {
      setWorking("");
    }
  }

  return (
    <section className="overflow-hidden rounded-lg border border-line bg-white">
      <div className="grid border-b border-line lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div className="p-4 md:p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-action text-white">
              <Upload aria-hidden="true" size={20} />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase text-action">Admin data import</p>
              <h2 className="mt-1 text-xl font-semibold text-ink">Upload official admission data</h2>
              <p className="mt-1 text-sm text-slate-600">Extraction is automatic. Publication requires approval.</p>
            </div>
          </div>

          <form className="mt-5 grid gap-4" onSubmit={submitImport}>
            <fieldset>
              <legend className="text-sm font-semibold text-ink">Document type</legend>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {documentTypes.map((type) => {
                  const active = form.documentType === type.value;
                  return (
                    <button
                      key={type.value}
                      className={`focus-ring min-h-16 rounded border px-3 py-2 text-left ${
                        active ? "border-action bg-cyan-50 text-action" : "border-line bg-white text-slate-700"
                      }`}
                      type="button"
                      aria-pressed={active}
                      onClick={() => updateField("documentType", type.value)}
                    >
                      <span className="block text-sm font-semibold">{type.label}</span>
                      <span className="mt-0.5 block text-xs text-slate-500">{type.note}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="grid gap-1.5 text-sm font-medium">
                Admission route
                <select
                  className="focus-ring min-h-11 rounded border border-line px-3"
                  value={form.admissionRoute}
                  onChange={(event) => updateField("admissionRoute", event.target.value)}
                >
                  <option value="FE">FE</option>
                  <option value="DSE">DSE</option>
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Academic year
                <input
                  className="focus-ring min-h-11 rounded border border-line px-3"
                  required
                  pattern="20\d{2}-\d{2}"
                  placeholder="2026-27"
                  value={form.academicYear}
                  onChange={(event) => updateField("academicYear", event.target.value)}
                />
              </label>
              {form.documentType === "CUTOFF_PDF" ? (
                <label className="grid gap-1.5 text-sm font-medium">
                  CAP round
                  <select
                    className="focus-ring min-h-11 rounded border border-line px-3"
                    value={form.capRound}
                    onChange={(event) => updateField("capRound", event.target.value)}
                  >
                    {[1, 2, 3, 4].map((round) => <option key={round} value={round}>Round {round}</option>)}
                  </select>
                </label>
              ) : null}
              <label className="grid gap-1.5 text-sm font-medium">
                Official source URL
                <input
                  className="focus-ring min-h-11 rounded border border-line px-3"
                  type="url"
                  placeholder="https://..."
                  value={form.sourceUrl}
                  onChange={(event) => updateField("sourceUrl", event.target.value)}
                />
              </label>
            </div>

            <label className="focus-within:ring-2 focus-within:ring-[#7db9ca] grid min-h-20 cursor-pointer place-items-center rounded border border-dashed border-slate-300 bg-panel px-4 py-3 text-center">
              <input
                ref={fileInputRef}
                className="sr-only"
                type="file"
                accept="application/pdf,.pdf"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
              />
              <span>
                <FileText aria-hidden="true" className="mx-auto text-action" size={21} />
                <span className="mt-1 block text-sm font-semibold text-ink">{file ? file.name : "Choose official PDF"}</span>
                <span className="mt-0.5 block text-xs text-slate-500">{file ? formatBytes(file.size) : "PDF, maximum 30 MB"}</span>
              </span>
            </label>

            <button
              className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded bg-action px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              type="submit"
              disabled={!file || Boolean(working)}
            >
              {working === "upload" ? <RefreshCw aria-hidden="true" className="animate-spin" size={17} /> : <FileCheck2 aria-hidden="true" size={17} />}
              {working === "upload" ? "Extracting and validating..." : "Upload and analyze"}
            </button>
          </form>
        </div>

        <aside className="border-t border-line bg-panel p-4 lg:border-l lg:border-t-0 md:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-action">Import history</p>
              <h3 className="mt-1 font-semibold text-ink">Recent files</h3>
            </div>
            <button
              className="focus-ring flex h-11 w-11 items-center justify-center rounded border border-line bg-white text-slate-600"
              type="button"
              aria-label="Refresh import history"
              disabled={loading}
              onClick={loadImports}
            >
              <RefreshCw aria-hidden="true" className={loading ? "animate-spin" : ""} size={17} />
            </button>
          </div>

          <div className="mt-3 max-h-[420px] divide-y divide-line overflow-y-auto rounded border border-line bg-white scrollbar-hidden">
            {imports.map((item) => (
              <button
                key={item.id}
                className={`focus-ring block w-full px-3 py-3 text-left ${selected?.id === item.id ? "bg-cyan-50" : "hover:bg-panel"}`}
                type="button"
                onClick={() => loadImport(item.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 break-words text-sm font-semibold text-ink">{item.originalFilename}</p>
                  <StatusBadge status={item.status} />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  #{item.id} | {item.academicYear} {item.capRound ? `| Round ${item.capRound}` : ""} | {item.recordCount ?? 0} records
                </p>
              </button>
            ))}
            {!loading && !imports.length ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">No imports yet.</div>
            ) : null}
          </div>
        </aside>
      </div>

      {error ? (
        <div className="flex items-start gap-3 border-b border-danger bg-red-50 px-4 py-3 text-sm text-danger" role="alert">
          <AlertCircle aria-hidden="true" className="mt-0.5 shrink-0" size={18} />
          <p>{error}</p>
        </div>
      ) : null}

      {selected ? (
        <div>
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line px-4 py-4 md:px-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={selected.status} />
                <span className="text-xs font-medium text-slate-500">Import #{selected.id}</span>
              </div>
              <h3 className="mt-2 break-words text-lg font-semibold text-ink">{selected.originalFilename}</h3>
              <p className="mt-1 text-sm text-slate-600">
                {selected.admissionRoute} | {selected.academicYear}
                {selected.capRound ? ` | CAP Round ${selected.capRound}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {selected.status === "VERIFIED" && selected.summary?.publishableRecords > 0 ? (
                <button
                  className="focus-ring inline-flex min-h-11 items-center gap-2 rounded bg-action px-4 text-sm font-semibold text-white disabled:opacity-50"
                  type="button"
                  disabled={Boolean(working)}
                  onClick={() => runAction("publish")}
                >
                  <Send aria-hidden="true" size={17} />
                  Publish validated records
                </button>
              ) : null}
              {selected.status === "PUBLISHED" ? (
                <button
                  className="focus-ring inline-flex min-h-11 items-center gap-2 rounded border border-danger bg-white px-4 text-sm font-semibold text-danger disabled:opacity-50"
                  type="button"
                  disabled={Boolean(working)}
                  onClick={() => runAction("rollback")}
                >
                  <RotateCcw aria-hidden="true" size={17} />
                  Roll back
                </button>
              ) : null}
            </div>
          </div>

          {selected.status === "NEEDS_REVIEW" ? (
            <div className="flex items-start gap-3 border-b border-warning bg-amber-50 px-4 py-3 text-sm text-warning md:px-5">
              <AlertCircle aria-hidden="true" className="mt-0.5 shrink-0" size={17} />
              <p>Publication is locked until every review row is corrected or explicitly excluded.</p>
            </div>
          ) : null}

          {selected.summary ? (
            <>
              <dl className="grid grid-cols-2 border-b border-line bg-panel sm:grid-cols-5">
                <Metric label="Extracted" value={selected.summary.totalRecords ?? selected.recordCount} />
                <Metric label="Ready to publish" value={selected.summary.publishableRecords ?? 0} tone="text-success" />
                <Metric label="Needs review" value={selected.summary.recordsNeedingReview ?? 0} tone="text-warning" />
                <Metric label="Excluded" value={selected.summary.excludedRecords ?? 0} />
                <Metric label="Published" value={selected.summary.publishedRecords ?? 0} tone="text-action" />
              </dl>

              {Object.keys(selected.summary.issueCounts || {}).length ? (
                <div className="border-b border-line px-4 py-4 md:px-5">
                  <p className="text-xs font-semibold uppercase text-slate-500">Validation issues</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {Object.entries(selected.summary.issueCounts).map(([issue, count]) => (
                      <span key={issue} className="rounded border border-warning bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-warning">
                        {issue.replaceAll("_", " ").toLowerCase()} | {count}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : null}

          {selected.records ? (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 md:px-5">
                <div>
                  <p className="text-xs font-semibold uppercase text-action">Record preview</p>
                  <p className="mt-1 text-xs text-slate-500">Showing up to 100 records.</p>
                </div>
                <div className="flex gap-1" aria-label="Preview record filter">
                  {[
                    ["ALL", "All"],
                    ["READY", "Ready"],
                    ["REVIEW", "Review"],
                    ["EXCLUDED", "Excluded"]
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      className={`focus-ring min-h-9 rounded border px-3 text-xs font-semibold ${
                        recordFilter === value ? "border-action bg-action text-white" : "border-line bg-white text-slate-700"
                      }`}
                      type="button"
                      onClick={() => changeRecordFilter(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="max-h-[620px] overflow-y-auto scrollbar-hidden">
                {selected.records.map((record) => (
                  <RecordPreview
                    key={record.id}
                    record={record}
                    canEdit={["VERIFIED", "NEEDS_REVIEW"].includes(selected.status)}
                    editing={editingRecordId === record.id}
                    working={working === `record-${record.id}`}
                    onEdit={() => setEditingRecordId(record.id)}
                    onCancel={() => setEditingRecordId("")}
                    onSave={(data) => correctRecord(record, data)}
                    onExclude={() => excludeRecord(record)}
                  />
                ))}
                {!selected.records.length ? (
                  <div className="px-4 py-10 text-center text-sm text-slate-500">No records match this preview filter.</div>
                ) : null}
              </div>
            </div>
          ) : (
            <button
              className="focus-ring flex min-h-12 w-full items-center justify-center gap-2 px-4 text-sm font-semibold text-action"
              type="button"
              disabled={working === `preview-${selected.id}`}
              onClick={() => loadImport(selected.id)}
            >
              {working === `preview-${selected.id}` ? <RefreshCw aria-hidden="true" className="animate-spin" size={17} /> : <Database aria-hidden="true" size={17} />}
              Load record preview
            </button>
          )}
        </div>
      ) : (
        <div className="grid place-items-center px-4 py-10 text-center">
          <div>
            <ShieldCheck aria-hidden="true" className="mx-auto text-action" size={25} />
            <p className="mt-3 font-semibold text-ink">Staged before publication</p>
            <p className="mt-1 text-sm text-slate-500">Select an import to inspect its validation report.</p>
          </div>
        </div>
      )}

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-panel px-4 py-3 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5"><Clock3 aria-hidden="true" size={14} /> Original files and reports are retained</span>
        <span className="inline-flex items-center gap-1.5"><CheckCircle2 aria-hidden="true" size={14} /> Only validated rows can be published</span>
      </footer>
    </section>
  );
}
