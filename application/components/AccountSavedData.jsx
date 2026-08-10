"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  CloudUpload,
  GitCompareArrows,
  ListOrdered,
  LoaderCircle,
  Trash2,
  UserRound
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  preferenceItemsFromAccount,
  saveCapListToAccount,
  saveComparisonToAccount
} from "../lib/accountStorage";
import { readComparisonList, writeComparisonList } from "../lib/comparisonList";
import { readPreferenceList, writePreferenceList } from "../lib/preferenceList";
import { savePendingPredictorForm } from "../lib/predictorProfiles";

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value));
}

function comparisonRoute(items) {
  return items?.[0]?.admissionRoute === "DSE" ? "DSE" : "FE";
}

function profileSummary(route, formData) {
  if (route === "DSE") {
    return [
      formData?.diplomaPercentage ? `${formData.diplomaPercentage}%` : null,
      formData?.category,
      formData?.diplomaBranch,
      formData?.cities?.length ? formData.cities.join(", ") : "All locations"
    ].filter(Boolean).join(" | ");
  }
  return [
    formData?.percentile ? `${formData.percentile} percentile` : null,
    formData?.category,
    formData?.branches?.length ? formData.branches.join(", ") : "All branches",
    formData?.cities?.length ? formData.cities.join(", ") : "All locations"
  ].filter(Boolean).join(" | ");
}

export function AccountSavedData() {
  const router = useRouter();
  const [preferenceLists, setPreferenceLists] = useState([]);
  const [comparisons, setComparisons] = useState([]);
  const [shortlists, setShortlists] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [history, setHistory] = useState([]);
  const [browserPreferences, setBrowserPreferences] = useState([]);
  const [browserComparisons, setBrowserComparisons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState("");
  const [migrationDismissed, setMigrationDismissed] = useState(false);

  async function loadAccountData() {
    const responses = await Promise.all([
      fetch("/api/preference-lists"),
      fetch("/api/saved-comparisons"),
      fetch("/api/shortlists"),
      fetch("/api/student-profiles"),
      fetch("/api/prediction-history")
    ]);
    const payloads = await Promise.all(responses.map((response) => response.json()));
    if (responses.some((response) => !response.ok)) {
      throw new Error("Could not load your saved account data.");
    }
    setPreferenceLists(payloads[0].data || []);
    setComparisons(payloads[1].data || []);
    setShortlists(payloads[2].data || []);
    setProfiles(payloads[3].data || []);
    setHistory(payloads[4].data || []);
  }

  useEffect(() => {
    setBrowserPreferences(readPreferenceList());
    setBrowserComparisons(readComparisonList());
    loadAccountData()
      .catch((error) => setNotice(error.message))
      .finally(() => setLoading(false));
  }, []);

  const browserComparisonGroups = useMemo(() => ({
    FE: browserComparisons.filter((item) => item.admissionRoute !== "DSE"),
    DSE: browserComparisons.filter((item) => item.admissionRoute === "DSE")
  }), [browserComparisons]);
  const hasBrowserChoices = browserPreferences.length > 0 ||
    browserComparisonGroups.FE.length >= 2 || browserComparisonGroups.DSE.length >= 2;

  async function copyBrowserChoices() {
    setSyncing(true);
    setNotice("");
    try {
      if (browserPreferences.length) {
        const { response, payload } = await saveCapListToAccount(browserPreferences);
        if (!response?.ok) throw new Error(payload?.error || "Could not save the CAP list.");
      }
      for (const route of ["FE", "DSE"]) {
        if (browserComparisonGroups[route].length >= 2) {
          const { response, payload } = await saveComparisonToAccount(browserComparisons, route);
          if (!response?.ok) throw new Error(payload?.error || `Could not save the ${route} comparison.`);
        }
      }
      await loadAccountData();
      setMigrationDismissed(true);
      setNotice("Browser choices saved to your account. The browser copies were kept.");
    } catch (error) {
      setNotice(error.message || "Could not save browser choices.");
    } finally {
      setSyncing(false);
    }
  }

  function openPreferenceList(list) {
    writePreferenceList(preferenceItemsFromAccount(Array.isArray(list.items) ? list.items : []));
    router.push("/preference-list");
  }

  function openComparison(comparison) {
    const route = comparisonRoute(comparison.items);
    const otherRoute = readComparisonList().filter((item) =>
      (item.admissionRoute === "DSE" ? "DSE" : "FE") !== route
    );
    writeComparisonList([...otherRoute, ...(Array.isArray(comparison.items) ? comparison.items : [])]);
    router.push(`/compare?route=${route}`);
  }

  function runPredictor(admissionRoute, formData) {
    savePendingPredictorForm(admissionRoute, formData);
    router.push(admissionRoute === "DSE" ? "/dse-predictor" : "/fe-predictor");
  }

  async function removeSaved(endpoint, id, setter) {
    if (!window.confirm("Remove this saved item from your account?")) return;
    const response = await fetch(`${endpoint}?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const payload = await response.json();
    if (!response.ok) {
      setNotice(payload.error || "Could not remove the saved item.");
      return;
    }
    setter((items) => items.filter((item) => String(item.id) !== String(id)));
    setNotice("Saved item removed from your account.");
  }

  if (loading) {
    return (
      <div className="mt-8 flex min-h-32 items-center justify-center gap-2 border-y border-line bg-white text-sm text-slate-500">
        <LoaderCircle aria-hidden="true" className="animate-spin" size={18} /> Loading your saved admission tools...
      </div>
    );
  }

  return (
    <div className="mt-7 grid gap-6">
      {notice ? (
        <div className="flex items-start gap-2 border-l-4 border-action bg-cyan-50 px-4 py-3 text-sm text-slate-700" role="status">
          <CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0 text-action" size={17} />
          <p>{notice}</p>
        </div>
      ) : null}

      {hasBrowserChoices && !migrationDismissed ? (
        <section className="surface-card border-action px-4 py-4 md:px-5">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="font-semibold text-ink">Choices found in this browser</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Copy {browserPreferences.length} CAP choice{browserPreferences.length === 1 ? "" : "s"} and saved comparisons to your account. Nothing will be removed from this device.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="focus-ring min-h-11 rounded border border-line px-4 text-sm font-medium" type="button" onClick={() => setMigrationDismissed(true)}>
                Not now
              </button>
              <button className="focus-ring inline-flex min-h-11 items-center gap-2 rounded bg-action px-4 text-sm font-semibold text-white disabled:opacity-60" type="button" disabled={syncing} onClick={copyBrowserChoices}>
                {syncing ? <LoaderCircle aria-hidden="true" className="animate-spin" size={17} /> : <CloudUpload aria-hidden="true" size={17} />}
                {syncing ? "Saving..." : "Save to my account"}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <section className="surface-card p-4 sm:p-5">
        <div className="flex items-end justify-between gap-3 border-b border-line pb-3">
          <div>
            <p className="text-xs font-semibold uppercase text-action">Reusable details</p>
            <h2 className="mt-1 text-lg font-semibold text-ink">Saved student profiles</h2>
          </div>
          <span className="text-sm font-semibold text-slate-500">{profiles.length}</span>
        </div>
        {profiles.length ? (
          <div className="divide-y divide-line">
            {profiles.map((profile) => (
              <div key={profile.id} className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded border border-action bg-cyan-50 px-2 py-1 text-xs font-semibold text-action">{profile.admissionRoute}</span>
                    <p className="font-semibold text-ink">{profile.name}</p>
                  </div>
                  <p className="mt-2 break-words text-sm text-slate-500">{profileSummary(profile.admissionRoute, profile.formData)}</p>
                </div>
                <div className="flex gap-2">
                  <button className="focus-ring inline-flex min-h-11 items-center gap-2 rounded bg-action px-4 text-sm font-semibold text-white" type="button" onClick={() => runPredictor(profile.admissionRoute, profile.formData)}>
                    Use profile <ArrowRight aria-hidden="true" size={16} />
                  </button>
                  <button className="focus-ring flex h-11 w-11 items-center justify-center rounded border border-line text-danger" type="button" title="Delete profile" aria-label={`Delete ${profile.name}`} onClick={() => removeSaved("/api/student-profiles", profile.id, setProfiles)}>
                    <Trash2 aria-hidden="true" size={17} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : <p className="py-6 text-sm text-slate-500">No saved profile yet. Sign in on either predictor and save the current form with a clear name.</p>}
      </section>

      <section className="surface-card p-4 sm:p-5">
        <div className="flex items-end justify-between gap-3 border-b border-line pb-3">
          <div>
            <p className="text-xs font-semibold uppercase text-action">Recent searches</p>
            <h2 className="mt-1 text-lg font-semibold text-ink">Prediction history</h2>
          </div>
          <span className="text-sm font-semibold text-slate-500">{history.length}</span>
        </div>
        {history.length ? (
          <div className="divide-y divide-line">
            {history.slice(0, 15).map((entry) => (
              <div key={entry.id} className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="rounded border border-line bg-panel px-2 py-1 text-xs font-semibold text-ink">{entry.admissionRoute}</span>
                    <span className="font-semibold text-ink">{entry.resultCount} matching options</span>
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500"><Clock3 aria-hidden="true" size={14} /> {formatDate(entry.createdAt)}</span>
                  </div>
                  <p className="mt-2 break-words text-sm text-slate-500">{profileSummary(entry.admissionRoute, entry.formData)}</p>
                </div>
                <div className="flex gap-2">
                  <button className="focus-ring inline-flex min-h-11 items-center gap-2 rounded border border-action bg-white px-4 text-sm font-semibold text-action" type="button" onClick={() => runPredictor(entry.admissionRoute, entry.formData)}>
                    Run again <ArrowRight aria-hidden="true" size={16} />
                  </button>
                  <button className="focus-ring flex h-11 w-11 items-center justify-center rounded border border-line text-danger" type="button" title="Delete history entry" aria-label="Delete prediction history entry" onClick={() => removeSaved("/api/prediction-history", entry.id, setHistory)}>
                    <Trash2 aria-hidden="true" size={17} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : <p className="py-6 text-sm text-slate-500">Successful FE and DSE predictions will appear here after you sign in.</p>}
      </section>

      <section className="surface-card p-4 sm:p-5">
        <div className="flex items-end justify-between gap-3 border-b border-line pb-3">
          <div>
            <p className="text-xs font-semibold uppercase text-action">CAP planning</p>
            <h2 className="mt-1 text-lg font-semibold text-ink">Saved preference lists</h2>
          </div>
          <span className="text-sm font-semibold text-slate-500">{preferenceLists.length}</span>
        </div>
        {preferenceLists.length ? (
          <div className="divide-y divide-line">
            {preferenceLists.map((list) => (
              <div key={list.id} className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center">
                <div className="min-w-0">
                  <p className="font-semibold text-ink">{list.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{list.items?.length || 0} choices | Updated {formatDate(list.updatedAt)}</p>
                </div>
                <div className="flex gap-2">
                  <button className="focus-ring inline-flex min-h-11 items-center gap-2 rounded bg-action px-4 text-sm font-semibold text-white" type="button" onClick={() => openPreferenceList(list)}>
                    Open <ArrowRight aria-hidden="true" size={16} />
                  </button>
                  <button className="focus-ring flex h-11 w-11 items-center justify-center rounded border border-line text-danger" type="button" title="Delete list" aria-label={`Delete ${list.name}`} onClick={() => removeSaved("/api/preference-lists", list.id, setPreferenceLists)}>
                    <Trash2 aria-hidden="true" size={17} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : <p className="py-6 text-sm text-slate-500">No account CAP list yet. Build one from prediction results or the CAP List page.</p>}
      </section>

      <section className="surface-card p-4 sm:p-5">
        <div className="flex items-end justify-between gap-3 border-b border-line pb-3">
          <div>
            <p className="text-xs font-semibold uppercase text-action">Decision tools</p>
            <h2 className="mt-1 text-lg font-semibold text-ink">Saved comparisons</h2>
          </div>
          <span className="text-sm font-semibold text-slate-500">{comparisons.length}</span>
        </div>
        {comparisons.length ? (
          <div className="divide-y divide-line">
            {comparisons.map((comparison) => (
              <div key={comparison.id} className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center">
                <div className="min-w-0">
                  <p className="font-semibold text-ink">{comparison.name}</p>
                  <p className="mt-1 truncate text-sm text-slate-500">{comparison.items?.map((item) => item.college).join(" | ")}</p>
                </div>
                <div className="flex gap-2">
                  <button className="focus-ring inline-flex min-h-11 items-center gap-2 rounded bg-action px-4 text-sm font-semibold text-white" type="button" onClick={() => openComparison(comparison)}>
                    Open <ArrowRight aria-hidden="true" size={16} />
                  </button>
                  <button className="focus-ring flex h-11 w-11 items-center justify-center rounded border border-line text-danger" type="button" title="Delete comparison" aria-label={`Delete ${comparison.name}`} onClick={() => removeSaved("/api/saved-comparisons", comparison.id, setComparisons)}>
                    <Trash2 aria-hidden="true" size={17} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : <p className="py-6 text-sm text-slate-500">No account comparison yet. Add at least two choices on the Compare page.</p>}
      </section>

      <section className="surface-card p-4 sm:p-5">
        <div className="flex items-end justify-between gap-3 border-b border-line pb-3">
          <div>
            <p className="text-xs font-semibold uppercase text-action">College research</p>
            <h2 className="mt-1 text-lg font-semibold text-ink">Saved colleges</h2>
          </div>
          <span className="text-sm font-semibold text-slate-500">{shortlists.length}</span>
        </div>
        {shortlists.length ? (
          <div className="divide-y divide-line">
            {shortlists.map((saved) => {
              const collegeBranch = saved.collegeBranch;
              const college = collegeBranch?.college;
              const branch = collegeBranch?.branch;
              return (
                <div key={saved.id} className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center">
                  <div className="min-w-0">
                    <Link className="font-semibold text-ink hover:text-action hover:underline" href={`/colleges/${college?.slug}`}>{college?.name || "Saved college"}</Link>
                    <p className="mt-1 text-sm text-slate-500">{branch?.displayName || branch?.officialName || "College overview"}{college?.city?.name ? ` | ${college.city.name}` : ""}</p>
                  </div>
                  <button className="focus-ring flex h-11 w-11 items-center justify-center rounded border border-line text-danger" type="button" title="Remove saved college" aria-label={`Remove ${college?.name || "saved college"}`} onClick={() => removeSaved("/api/shortlists", saved.id, setShortlists)}>
                    <Trash2 aria-hidden="true" size={17} />
                  </button>
                </div>
              );
            })}
          </div>
        ) : <p className="py-6 text-sm text-slate-500">No saved colleges yet. You can still use CAP lists and comparisons without creating a separate shortlist.</p>}
      </section>

      <nav className="surface-card grid gap-3 bg-panel px-4 py-5 sm:grid-cols-3" aria-label="Admission tools">
        <Link className="focus-ring inline-flex min-h-11 items-center gap-2 rounded bg-white px-4 text-sm font-semibold text-ink" href="/fe-predictor"><UserRound aria-hidden="true" className="text-action" size={18} /> Open predictor</Link>
        <Link className="focus-ring inline-flex min-h-11 items-center gap-2 rounded bg-white px-4 text-sm font-semibold text-ink" href="/compare"><GitCompareArrows aria-hidden="true" className="text-action" size={18} /> Compare colleges</Link>
        <Link className="focus-ring inline-flex min-h-11 items-center gap-2 rounded bg-white px-4 text-sm font-semibold text-ink" href="/preference-list"><ListOrdered aria-hidden="true" className="text-action" size={18} /> Open CAP List</Link>
      </nav>
    </div>
  );
}
