"use client";

import {
  Archive,
  Building2,
  CheckCircle2,
  History,
  RefreshCw,
  RotateCcw,
  Search
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const emptyData = { cutoffSets: [], collegeArchives: [] };

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function AdminDataControls() {
  const [data, setData] = useState(emptyData);
  const [cutoffForm, setCutoffForm] = useState({ admissionRoute: "FE", academicYear: "", capRound: "" });
  const [collegeForm, setCollegeForm] = useState({ admissionRoute: "FE", query: "", selected: null, reason: "" });
  const [collegeResults, setCollegeResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function api(url, options = {}) {
    const response = await fetch(url, { cache: "no-store", ...options });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "The admin data action failed.");
    return payload;
  }

  async function loadData() {
    setLoading(true);
    try {
      const response = await api("/api/admin/data-controls");
      setData(response.data || emptyData);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const query = collegeForm.query.trim();
    if (query.length < 2 || collegeForm.selected) {
      setCollegeResults([]);
      return undefined;
    }
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          route: collegeForm.admissionRoute,
          q: query,
          pageSize: "8"
        });
        const response = await api(`/api/colleges?${params}`);
        setCollegeResults(response.data || []);
      } catch {
        setCollegeResults([]);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [collegeForm.admissionRoute, collegeForm.query, collegeForm.selected]);

  const activeSets = data.cutoffSets.filter((set) => set.activeDatasets > 0);
  const routeSets = activeSets.filter((set) => set.admissionRoute === cutoffForm.admissionRoute);
  const years = [...new Set(routeSets.map((set) => set.academicYear))].sort().reverse();
  const rounds = [...new Set(routeSets
    .filter((set) => !cutoffForm.academicYear || set.academicYear === cutoffForm.academicYear)
    .map((set) => set.capRound))].sort((left, right) => left - right);
  const selectedCutoffSets = useMemo(() => activeSets.filter((set) => (
    set.admissionRoute === cutoffForm.admissionRoute &&
    set.academicYear === cutoffForm.academicYear &&
    (!cutoffForm.capRound || set.capRound === Number(cutoffForm.capRound))
  )), [activeSets, cutoffForm]);
  const selectedRecordCount = selectedCutoffSets.reduce((sum, set) => sum + set.activeRecords, 0);
  const archivedSets = data.cutoffSets.filter((set) => set.archivedDatasets > 0);

  useEffect(() => {
    if (!cutoffForm.academicYear || !years.includes(cutoffForm.academicYear)) {
      setCutoffForm((current) => ({ ...current, academicYear: years[0] || "", capRound: "" }));
    }
  }, [cutoffForm.academicYear, cutoffForm.admissionRoute, years.join("|")]);

  async function runAction(payload, confirmation, successMessage) {
    if (!window.confirm(confirmation)) return;
    setWorking(payload.action);
    setError("");
    setNotice("");
    try {
      await api("/api/admin/data-controls", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      setNotice(successMessage);
      setCollegeForm((current) => ({ ...current, query: "", selected: null, reason: "" }));
      await loadData();
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setWorking("");
    }
  }

  function archiveCutoffs() {
    if (!cutoffForm.academicYear || !selectedRecordCount) return;
    const roundText = cutoffForm.capRound ? ` CAP Round ${cutoffForm.capRound}` : " all CAP rounds";
    runAction(
      {
        action: "ARCHIVE_CUTOFFS",
        admissionRoute: cutoffForm.admissionRoute,
        academicYear: cutoffForm.academicYear,
        capRound: cutoffForm.capRound ? Number(cutoffForm.capRound) : null
      },
      `Archive ${selectedRecordCount.toLocaleString("en-IN")} ${cutoffForm.admissionRoute} cutoff records for ${cutoffForm.academicYear},${roundText}? They will stop affecting predictions but remain available for historical analysis.`,
      `${cutoffForm.admissionRoute} ${cutoffForm.academicYear}${cutoffForm.capRound ? ` Round ${cutoffForm.capRound}` : ""} was archived from predictions.`
    );
  }

  function restoreCutoffs(set) {
    runAction(
      {
        action: "RESTORE_CUTOFFS",
        admissionRoute: set.admissionRoute,
        academicYear: set.academicYear,
        capRound: set.capRound
      },
      `Restore ${set.archivedRecords.toLocaleString("en-IN")} cutoff records to live ${set.admissionRoute} predictions?`,
      `${set.admissionRoute} ${set.academicYear} Round ${set.capRound} was restored.`
    );
  }

  function archiveCollege() {
    const college = collegeForm.selected;
    if (!college) return;
    runAction(
      {
        action: "ARCHIVE_COLLEGE_ROUTE",
        admissionRoute: collegeForm.admissionRoute,
        instituteCode: college.instituteCode,
        reason: collegeForm.reason.trim() || undefined
      },
      `Remove ${college.name} from current ${collegeForm.admissionRoute} search, prediction, comparison and college pages? Its database records and other admission route will remain safe.`,
      `${college.name} was archived from ${collegeForm.admissionRoute}.`
    );
  }

  function restoreCollege(archive) {
    runAction(
      {
        action: "RESTORE_COLLEGE_ROUTE",
        admissionRoute: archive.admissionRoute,
        instituteCode: archive.college.instituteCode
      },
      `Restore ${archive.college.name} to current ${archive.admissionRoute} features?`,
      `${archive.college.name} was restored to ${archive.admissionRoute}.`
    );
  }

  return (
    <section className="surface-card overflow-hidden">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-4 md:px-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-action text-white">
            <Archive aria-hidden="true" size={20} />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase text-action">Safe data removal</p>
            <h2 className="mt-1 text-xl font-semibold text-ink">Archive and restore admission data</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
              Archived records stop affecting live student tools, but remain in PostgreSQL for history, backtesting and audit.
            </p>
          </div>
        </div>
        <button
          aria-label="Refresh archive data"
          className="focus-ring flex h-11 w-11 items-center justify-center rounded border border-line bg-white text-slate-600"
          type="button"
          disabled={loading}
          onClick={loadData}
        >
          <RefreshCw aria-hidden="true" className={loading ? "animate-spin" : ""} size={18} />
        </button>
      </header>

      {error ? <p className="border-b border-danger bg-red-50 px-4 py-3 text-sm text-danger" role="alert">{error}</p> : null}
      {notice ? (
        <p className="flex items-center gap-2 border-b border-success bg-emerald-50 px-4 py-3 text-sm text-success" role="status">
          <CheckCircle2 aria-hidden="true" size={17} /> {notice}
        </p>
      ) : null}

      <div className="grid lg:grid-cols-2">
        <div className="border-b border-line p-4 md:p-5 lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-2">
            <History aria-hidden="true" className="text-action" size={19} />
            <h3 className="font-semibold text-ink">Archive a cutoff set</h3>
          </div>
          <p className="mt-1 text-sm text-slate-600">Choose one route and year. You may archive one round or every round.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <label className="grid gap-1.5 text-sm font-medium">
              Route
              <select
                className="focus-ring min-h-11 rounded border border-line px-3"
                value={cutoffForm.admissionRoute}
                onChange={(event) => setCutoffForm({ admissionRoute: event.target.value, academicYear: "", capRound: "" })}
              >
                <option value="FE">FE</option><option value="DSE">DSE</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Academic year
              <select
                className="focus-ring min-h-11 rounded border border-line px-3"
                value={cutoffForm.academicYear}
                onChange={(event) => setCutoffForm((current) => ({ ...current, academicYear: event.target.value, capRound: "" }))}
              >
                {years.map((year) => <option key={year}>{year}</option>)}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              CAP round
              <select
                className="focus-ring min-h-11 rounded border border-line px-3"
                value={cutoffForm.capRound}
                onChange={(event) => setCutoffForm((current) => ({ ...current, capRound: event.target.value }))}
              >
                <option value="">All rounds</option>
                {rounds.map((round) => <option key={round} value={round}>Round {round}</option>)}
              </select>
            </label>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            <p className="text-sm text-slate-600">
              <strong className="text-ink">{selectedRecordCount.toLocaleString("en-IN")}</strong> live cutoff records selected
            </p>
            <button
              className="focus-ring inline-flex min-h-11 items-center gap-2 rounded border border-warning bg-amber-50 px-4 text-sm font-semibold text-warning disabled:opacity-50"
              type="button"
              disabled={!selectedRecordCount || Boolean(working)}
              onClick={archiveCutoffs}
            >
              <Archive aria-hidden="true" size={17} /> Archive from predictions
            </button>
          </div>
        </div>

        <div className="p-4 md:p-5">
          <div className="flex items-center gap-2">
            <Building2 aria-hidden="true" className="text-action" size={19} />
            <h3 className="font-semibold text-ink">Archive a college from one route</h3>
          </div>
          <p className="mt-1 text-sm text-slate-600">The college remains available for its other admission route and historical records.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-[110px_minmax(0,1fr)]">
            <label className="grid gap-1.5 text-sm font-medium">
              Route
              <select
                className="focus-ring min-h-11 rounded border border-line px-3"
                value={collegeForm.admissionRoute}
                onChange={(event) => setCollegeForm({ admissionRoute: event.target.value, query: "", selected: null, reason: "" })}
              >
                <option value="FE">FE</option><option value="DSE">DSE</option>
              </select>
            </label>
            <div className="relative grid gap-1.5 text-sm font-medium">
              <label htmlFor="archive-college-search">College name or current code</label>
              <div className="flex min-h-11 items-center gap-2 rounded border border-line px-3">
                <Search aria-hidden="true" className="shrink-0 text-slate-400" size={18} />
                <input
                  id="archive-college-search"
                  className="min-w-0 flex-1 border-0 outline-none"
                  placeholder="Type at least 2 characters"
                  value={collegeForm.selected ? `${collegeForm.selected.instituteCode} - ${collegeForm.selected.name}` : collegeForm.query}
                  onChange={(event) => setCollegeForm((current) => ({ ...current, query: event.target.value, selected: null }))}
                />
              </div>
              {collegeResults.length ? (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded border border-line bg-white shadow-lg">
                  {collegeResults.map((college) => (
                    <button
                      key={college.instituteCode}
                      className="block min-h-11 w-full border-b border-line px-3 py-2 text-left text-sm last:border-b-0 hover:bg-panel"
                      type="button"
                      onClick={() => setCollegeForm((current) => ({ ...current, selected: college, query: college.name }))}
                    >
                      <span className="font-semibold text-ink">{college.name}</span>
                      <span className="mt-0.5 block text-xs text-slate-500">{college.instituteCode} | {college.city?.name || "Location unavailable"}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <label className="mt-3 grid gap-1.5 text-sm font-medium">
            Reason (optional)
            <input
              className="focus-ring min-h-11 rounded border border-line px-3"
              maxLength={300}
              placeholder="Example: not present in current official route list"
              value={collegeForm.reason}
              onChange={(event) => setCollegeForm((current) => ({ ...current, reason: event.target.value }))}
            />
          </label>
          <div className="mt-4 flex justify-end border-t border-line pt-4">
            <button
              className="focus-ring inline-flex min-h-11 items-center gap-2 rounded border border-warning bg-amber-50 px-4 text-sm font-semibold text-warning disabled:opacity-50"
              type="button"
              disabled={!collegeForm.selected || Boolean(working)}
              onClick={archiveCollege}
            >
              <Archive aria-hidden="true" size={17} /> Archive {collegeForm.admissionRoute} college
            </button>
          </div>
        </div>
      </div>

      {(archivedSets.length || data.collegeArchives.length) ? (
        <div className="border-t border-line bg-panel px-4 py-4 md:px-5">
          <h3 className="font-semibold text-ink">Archived data</h3>
          <p className="mt-1 text-sm text-slate-600">Restore an item when it should return to live student features.</p>
          <div className="mt-3 grid gap-2 lg:grid-cols-2">
            {archivedSets.map((set) => (
              <div key={set.key} className="flex min-w-0 items-center justify-between gap-3 border border-line bg-white px-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{set.admissionRoute} {set.academicYear} | CAP Round {set.capRound}</p>
                  <p className="mt-1 text-xs text-slate-500">{set.archivedRecords.toLocaleString("en-IN")} records | {formatDate(set.archivedAt)}</p>
                </div>
                <button
                  aria-label={`Restore ${set.admissionRoute} ${set.academicYear} Round ${set.capRound}`}
                  className="focus-ring flex h-11 w-11 shrink-0 items-center justify-center rounded border border-action bg-white text-action"
                  type="button"
                  disabled={Boolean(working)}
                  onClick={() => restoreCutoffs(set)}
                >
                  <RotateCcw aria-hidden="true" size={18} />
                </button>
              </div>
            ))}
            {data.collegeArchives.map((archive) => (
              <div key={archive.id} className="flex min-w-0 items-center justify-between gap-3 border border-line bg-white px-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{archive.college.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{archive.college.instituteCode} | {archive.admissionRoute} | {formatDate(archive.archivedAt)}</p>
                  {archive.reason ? <p className="mt-1 truncate text-xs text-slate-600" title={archive.reason}>{archive.reason}</p> : null}
                </div>
                <button
                  aria-label={`Restore ${archive.college.name} to ${archive.admissionRoute}`}
                  className="focus-ring flex h-11 w-11 shrink-0 items-center justify-center rounded border border-action bg-white text-action"
                  type="button"
                  disabled={Boolean(working)}
                  onClick={() => restoreCollege(archive)}
                >
                  <RotateCcw aria-hidden="true" size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
