"use client";

import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Building2,
  CloudUpload,
  ExternalLink,
  GitCompareArrows,
  MapPin,
  RefreshCw,
  Trash2,
  X
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CollegeAutocomplete } from "../../components/CollegeAutocomplete";
import { SiteHeader } from "../../components/SiteHeader";
import { saveComparisonToAccount } from "../../lib/accountStorage";
import { trackAnalyticsEvent } from "../../lib/analytics";
import {
  readComparisonList,
  writeComparisonList
} from "../../lib/comparisonList";

const MAX_COLLEGES = 3;

const zoneStyle = {
  SAFE: "border-success bg-emerald-50 text-success",
  TARGET: "border-action bg-cyan-50 text-action",
  AMBITIOUS: "border-warning bg-amber-50 text-warning",
  HIGHLY_AMBITIOUS: "border-danger bg-red-50 text-danger"
};

const zoneLabel = {
  SAFE: "Safe",
  TARGET: "Target",
  AMBITIOUS: "Ambitious",
  HIGHLY_AMBITIOUS: "Highly Ambitious"
};

const trendLabel = {
  RISING: "Rising cutoff",
  STABLE: "Stable cutoff",
  FALLING: "Falling cutoff"
};

function emptySlot() {
  return {
    college: null,
    branchCode: "",
    branches: [],
    loadingBranches: false,
    prediction: null,
    resetKey: 0
  };
}

function hasValue(value) {
  return value !== null && value !== undefined && value !== "" && value !== "N/A";
}

function formatNumber(value) {
  return hasValue(value) && Number.isFinite(Number(value)) ? Number(value).toFixed(2) : "Not available";
}

function formatMoney(value) {
  return hasValue(value) ? `Rs. ${Number(value).toLocaleString("en-IN")}` : "Not available";
}

function normalizeAdmissionRoute(value) {
  return value === "DSE" ? "DSE" : "FE";
}

function Fact({ label, value, note, tone = "normal" }) {
  const toneClass = {
    normal: "text-ink",
    good: "text-success",
    warning: "text-warning"
  }[tone];

  return (
    <div className="min-w-0 py-3">
      <dt className="text-xs font-medium uppercase text-slate-500">{label}</dt>
      <dd className={`mt-1 break-words text-base font-semibold ${toneClass}`}>{value}</dd>
      {note ? <p className="mt-1 text-xs leading-5 text-slate-500">{note}</p> : null}
    </div>
  );
}

function ComparisonCard({ item, position }) {
  const prediction = item.prediction;
  const isDse = item.admissionRoute === "DSE";
  const missing = [
    !item.branch ? "Select a branch to compare cutoff and seat information." : null,
    item.branch && !item.latestOpenCutoff ? `${item.admissionRoute} OPEN general cutoff history is unavailable for this branch.` : null,
    !item.approvedFee ? "Approved annual fee is not available." : null
  ].filter(Boolean);
  const marginTone = prediction?.margin >= 0 ? "good" : "warning";
  const collegeParams = new URLSearchParams({ route: item.admissionRoute });
  if (item.branch) collegeParams.set("branch", item.branch.name);

  return (
    <article className="min-w-0 overflow-hidden rounded-lg border border-line bg-white">
      <div className={`h-1 ${prediction?.zone === "SAFE" ? "bg-success" : prediction?.zone === "TARGET" ? "bg-action" : prediction ? "bg-warning" : "bg-slate-300"}`} />
      <header className="min-h-[178px] p-4 md:p-5">
        <p className="text-xs font-semibold uppercase text-slate-500">{item.admissionRoute} choice {position} | Institute {item.instituteCode}</p>
        <h2 className="mt-2 text-lg font-semibold leading-6 text-ink">{item.name}</h2>
        <p className="mt-2 font-semibold text-action">{item.branch?.name || "College overview"}</p>
        <div className="mt-3 grid gap-1 text-xs text-slate-500">
          {item.city ? <span className="inline-flex items-start gap-1.5"><MapPin aria-hidden="true" className="mt-0.5 shrink-0" size={14} />{item.city}</span> : null}
          {item.university ? <span className="inline-flex items-start gap-1.5"><Building2 aria-hidden="true" className="mt-0.5 shrink-0" size={14} />{item.university}</span> : null}
        </div>
      </header>

      {prediction ? (
        <section className="border-y border-line bg-panel px-4 py-4 md:px-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium uppercase text-slate-500">Your prediction</p>
            <span className={`rounded border px-2.5 py-1 text-xs font-semibold ${zoneStyle[prediction.zone] || "border-line"}`}>
              {zoneLabel[prediction.zone] || prediction.zone}
            </span>
          </div>
          <dl className="mt-2 grid grid-cols-2 gap-x-5 divide-x divide-line">
            <Fact
              label="Your margin"
              value={`${prediction.margin >= 0 ? "+" : ""}${formatNumber(prediction.margin)}`}
              tone={marginTone}
              note="Against prediction benchmark"
            />
            <div className="pl-5">
              <Fact label="Seat used" value={prediction.seatType || "Not available"} note={`${prediction.year || ""}${prediction.round ? `, Round ${prediction.round}` : ""}`} />
            </div>
          </dl>
        </section>
      ) : null}

      <section className="px-4 py-4 md:px-5">
        <h3 className="text-sm font-semibold text-ink">College and branch strength</h3>
        <dl className="mt-2 divide-y divide-line border-y border-line">
          <Fact
            label="Historical Demand Index"
            value={hasValue(item.historicalDemandIndex) ? `${Math.round(item.historicalDemandIndex)} / 100` : "Not available"}
            note={item.demandBand ? `${item.demandBand} demand band` : `Based on previous ${item.admissionRoute} cutoff demand`}
          />
          <Fact
            label={`Latest ${item.admissionRoute} OPEN cutoff`}
            value={formatNumber(item.latestOpenCutoff?.closingScore)}
            note={item.latestOpenCutoff
              ? `${item.latestOpenCutoff.year}, CAP Round ${item.latestOpenCutoff.round} | ${item.latestOpenCutoff.seatType}`
              : "Choose a branch with published OPEN general records"}
          />
          {isDse ? (
            <div className={`grid gap-x-5 ${hasValue(item.branch?.vacantSeats) ? "grid-cols-2 divide-x divide-line" : "grid-cols-1"}`}>
              <Fact
                label="DSE lateral-entry seats"
                value={item.branch?.lateralEntrySeats ?? "Not available"}
                note={item.branch?.academicYear || undefined}
              />
              {hasValue(item.branch?.vacantSeats) ? (
                <div className="pl-5">
                  <Fact label="Previous-intake vacancies" value={item.branch.vacantSeats} />
                </div>
              ) : null}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-5 divide-x divide-line">
              <Fact label="Approved branch intake" value={item.branch?.sanctionedIntake ?? "Not available"} note={item.branch?.academicYear || undefined} />
              <div className="pl-5">
                <Fact label="CAP seats" value={item.branch?.capSeats ?? "Not available"} />
              </div>
            </div>
          )}
        </dl>
      </section>

      <section className="border-t border-line px-4 py-4 md:px-5">
        <h3 className="text-sm font-semibold text-ink">Institute facts</h3>
        <dl className="mt-2 divide-y divide-line border-y border-line">
          <Fact label="Ownership" value={item.ownership || "Not available"} />
          <Fact
            label="Academic status"
            value={item.autonomous === true ? "Autonomous" : item.autonomous === false ? "Non-autonomous" : "Not available"}
          />
          {item.minority ? <Fact label="Minority status" value={item.minority} /> : null}
          <Fact
            label="Approved annual fee"
            value={formatMoney(item.approvedFee)}
            note={item.feeYear ? `Fee year ${item.feeYear}` : "Use the latest official FRA notice before admission"}
          />
        </dl>
      </section>

      {item.openCutoffHistory.length ? (
        <details className="border-t border-line text-sm">
          <summary className="focus-ring cursor-pointer px-4 py-4 font-semibold text-action md:px-5">
            OPEN cutoff history ({item.openCutoffHistory.length} year{item.openCutoffHistory.length === 1 ? "" : "s"})
          </summary>
          <div className="border-t border-line px-4 py-3 md:px-5">
            {item.cutoffTrend ? <p className="mb-2 text-xs font-medium text-slate-500">{trendLabel[item.cutoffTrend]}</p> : null}
            <div className="divide-y divide-line border-y border-line">
              {item.openCutoffHistory.map((record) => (
                <div key={record.year} className="grid grid-cols-[1fr_auto] gap-3 py-3 text-sm">
                  <div>
                    <p className="font-semibold text-ink">{record.year}, Round {record.round}</p>
                    <p className="text-xs text-slate-500">{record.seatType}</p>
                  </div>
                  <p className="font-semibold text-ink">{formatNumber(record.closingScore)}</p>
                </div>
              ))}
            </div>
          </div>
        </details>
      ) : null}

      {missing.length ? (
        <div className="border-t border-line bg-panel px-4 py-3 text-xs leading-5 text-slate-600 md:px-5">
          {missing.map((message) => <p key={message}>{message}</p>)}
        </div>
      ) : null}

      <footer className="flex flex-wrap gap-2 border-t border-line px-4 py-4 md:px-5">
        <Link className="focus-ring inline-flex min-h-11 items-center gap-2 rounded bg-action px-4 text-sm font-semibold text-white" href={`/colleges/${item.slug}?${collegeParams.toString()}`}>
          College details <ArrowRight aria-hidden="true" size={17} />
        </Link>
        {item.officialWebsite ? (
          <a className="focus-ring inline-flex min-h-11 items-center gap-2 rounded border border-line px-4 text-sm font-semibold" href={item.officialWebsite} target="_blank" rel="noreferrer">
            Official site <ExternalLink aria-hidden="true" size={16} />
          </a>
        ) : null}
      </footer>
    </article>
  );
}

export default function ComparePage() {
  const router = useRouter();
  const [admissionRoute, setAdmissionRoute] = useState("FE");
  const [routeReady, setRouteReady] = useState(false);
  const [slots, setSlots] = useState(() => Array.from({ length: MAX_COLLEGES }, emptySlot));
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);

  async function getBranches(slug, route) {
    const response = await fetch(`/api/colleges/${encodeURIComponent(slug)}/branches?route=${route}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Could not load branches");
    return payload.data || [];
  }

  useEffect(() => {
    const requestedRoute = new URLSearchParams(window.location.search).get("route");
    setAdmissionRoute(normalizeAdmissionRoute(requestedRoute));
    setRouteReady(true);
  }, []);

  useEffect(() => {
    if (!routeReady) return undefined;
    let active = true;

    async function restoreSavedItems() {
      const saved = readComparisonList().filter((item) =>
        normalizeAdmissionRoute(item.admissionRoute) === admissionRoute
      );
      const restored = await Promise.all(saved.map(async (item) => {
        let branches = [];
        try {
          branches = await getBranches(item.collegeSlug, admissionRoute);
        } catch {
          branches = [];
        }
        return {
          college: {
            instituteCode: item.instituteCode,
            name: item.college,
            slug: item.collegeSlug
          },
          branchCode: item.branchCode || "",
          branches,
          loadingBranches: false,
          prediction: item.prediction || null,
          resetKey: 0
        };
      }));

      if (!active) return;
      setSlots([...restored, ...Array.from({ length: MAX_COLLEGES - restored.length }, emptySlot)]);
      setHydrated(true);
    }

    restoreSavedItems();
    return () => {
      active = false;
    };
  }, [admissionRoute, routeReady]);

  function persist(nextSlots) {
    const otherRouteItems = readComparisonList().filter((item) =>
      normalizeAdmissionRoute(item.admissionRoute) !== admissionRoute
    );
    const currentRouteItems = nextSlots.filter((slot) => slot.college).map((slot) => ({
      admissionRoute,
      instituteCode: slot.college.instituteCode,
      college: slot.college.name,
      collegeSlug: slot.college.slug,
      branchCode: slot.branchCode,
      branch: slot.branches.find((branch) => branch.branchCode === slot.branchCode)?.name || "",
      prediction: slot.prediction
    }));
    writeComparisonList([...otherRouteItems, ...currentRouteItems]);
  }

  async function chooseCollege(index, college) {
    setMessage("");
    setSlots((current) => current.map((slot, slotIndex) =>
      slotIndex === index
        ? { ...slot, college, branchCode: "", branches: [], loadingBranches: true, prediction: null }
        : slot
    ));

    try {
      const branches = await getBranches(college.slug, admissionRoute);
      setSlots((current) => {
        const next = current.map((slot, slotIndex) =>
          slotIndex === index
            ? { ...slot, college, branches, loadingBranches: false }
            : slot
        );
        persist(next);
        return next;
      });
    } catch (error) {
      setMessage(error.message);
      setSlots((current) => current.map((slot, slotIndex) =>
        slotIndex === index ? { ...slot, loadingBranches: false } : slot
      ));
    }
  }

  function changeBranch(index, branchCode) {
    setResults([]);
    setSlots((current) => {
      const next = current.map((slot, slotIndex) =>
        slotIndex === index ? { ...slot, branchCode, prediction: null } : slot
      );
      persist(next);
      return next;
    });
  }

  function removeSlot(index) {
    setResults([]);
    setMessage("");
    setSlots((current) => {
      const remaining = current.filter((_, slotIndex) => slotIndex !== index);
      const next = [...remaining, { ...emptySlot(), resetKey: Date.now() }].slice(0, MAX_COLLEGES);
      persist(next);
      return next;
    });
  }

  function clearAll() {
    writeComparisonList(readComparisonList().filter((item) =>
      normalizeAdmissionRoute(item.admissionRoute) !== admissionRoute
    ));
    setSlots(Array.from({ length: MAX_COLLEGES }, emptySlot));
    setResults([]);
    setMessage("");
  }

  function changeAdmissionRoute(route) {
    if (route === admissionRoute) return;
    setHydrated(false);
    setResults([]);
    setMessage("");
    setAdmissionRoute(route);
    router.replace(`/compare?route=${route}`, { scroll: false });
  }

  async function compareColleges() {
    const selected = slots.filter((slot) => slot.college);
    if (selected.length < 2) {
      setMessage("Select at least two colleges before comparing.");
      return;
    }

    const keys = selected.map((slot) => `${slot.college.instituteCode}|${slot.branchCode}`);
    if (new Set(keys).size !== keys.length) {
      setMessage("Choose a different branch when comparing the same college twice.");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/compare", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          admissionRoute,
          selections: selected.map((slot) => ({
            instituteCode: slot.college.instituteCode,
            branchCode: slot.branchCode || undefined
          }))
        })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Comparison failed");

      const withPredictions = payload.data.map((item) => ({
        ...item,
        prediction: selected.find((slot) =>
          slot.college.instituteCode === item.instituteCode &&
          (slot.branchCode || "") === (item.branch?.branchCode || "")
        )?.prediction || null
      }));
      setResults(withPredictions);
      persist(slots);
      trackAnalyticsEvent("comparison_completed", {
        admission_route: admissionRoute,
        option_count: withPredictions.length
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setMessage(error.message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  async function saveToAccount() {
    const selectedCount = slots.filter((slot) => slot.college).length;
    if (selectedCount < 2) {
      setMessage("Select at least two colleges before saving the comparison.");
      return;
    }

    persist(slots);
    setSavingAccount(true);
    setMessage("");
    try {
      const { response, payload } = await saveComparisonToAccount(readComparisonList(), admissionRoute);
      if (response?.status === 401) {
        setMessage("Sign in to save this comparison to your account. It is still saved in this browser.");
      } else if (!response?.ok) {
        setMessage(payload?.error || "Could not save this comparison to your account.");
      } else {
        setMessage("Comparison saved to your account.");
      }
    } catch {
      setMessage("Account save is unavailable right now. This comparison is still saved in your browser.");
    } finally {
      setSavingAccount(false);
    }
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-7 md:py-9">
        <header className="border-l-4 border-action pl-4">
          <p className="text-xs font-semibold uppercase text-action">Decision workspace</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink md:text-3xl">Compare college and branch choices</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Compare up to three options using route-specific cutoff history, approved seats, fees and verified college facts.
          </p>
        </header>

        <section className="mt-6 border-y border-line bg-white px-4 py-4 md:px-5" aria-label="Admission route">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Admission route</p>
              <p className="mt-1 text-sm text-slate-600">All colleges, branches, cutoffs and seats below use the selected route.</p>
            </div>
            <div className="grid grid-cols-2 rounded border border-line bg-panel p-1" role="group" aria-label="Choose admission route">
              {[{ code: "FE", label: "First Year" }, { code: "DSE", label: "Direct Second Year" }].map((route) => (
                <button
                  key={route.code}
                  className={`focus-ring min-h-11 rounded px-4 text-sm font-semibold ${admissionRoute === route.code ? "bg-action text-white" : "text-slate-700 hover:bg-white"}`}
                  type="button"
                  aria-pressed={admissionRoute === route.code}
                  onClick={() => changeAdmissionRoute(route.code)}
                >
                  {route.label} ({route.code})
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-5 overflow-visible rounded-lg border border-line bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-4 md:px-5">
            <div>
              <h2 className="font-semibold text-ink">Choose {admissionRoute} colleges</h2>
              <p className="mt-1 text-sm text-slate-500">A branch is optional, but required for {admissionRoute} cutoff and seat comparison.</p>
            </div>
            <button className="focus-ring inline-flex min-h-11 items-center gap-2 rounded border border-line px-3 text-sm font-semibold text-slate-700" type="button" onClick={clearAll}>
              <Trash2 aria-hidden="true" size={16} /> Clear {admissionRoute} choices
            </button>
          </div>

          <div className="grid gap-0 divide-y divide-line lg:grid-cols-3 lg:divide-x lg:divide-y-0">
            {slots.map((slot, index) => (
              <div key={`${index}-${slot.college?.instituteCode || "empty"}-${slot.resetKey}`} className="relative min-w-0 p-4 md:p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-ink">Choice {index + 1}</p>
                  {slot.college ? (
                    <button className="focus-ring flex h-11 w-11 items-center justify-center rounded text-slate-500 hover:bg-panel" type="button" aria-label={`Remove choice ${index + 1}`} onClick={() => removeSlot(index)}>
                      <X aria-hidden="true" size={18} />
                    </button>
                  ) : null}
                </div>
                <CollegeAutocomplete
                  admissionRoute={admissionRoute}
                  defaultValue={slot.college?.name || ""}
                  selectionMode="fill"
                  showIcon
                  placeholder="College name or institute code"
                  className="focus-within:ring-2 focus-within:ring-[#7db9ca] mt-3 min-h-11 rounded border border-line px-3"
                  onSelect={(college) => chooseCollege(index, college)}
                  onQueryChange={(value) => {
                    if (slot.college && value !== slot.college.name) {
                      setSlots((current) => current.map((item, slotIndex) =>
                        slotIndex === index
                          ? { ...item, college: null, branchCode: "", branches: [], prediction: null }
                          : item
                      ));
                    }
                  }}
                />
                <label className="mt-3 grid gap-1.5 text-sm font-medium text-ink">
                  Branch
                  <select
                    className="focus-ring min-h-11 min-w-0 rounded border border-line px-3 disabled:bg-panel disabled:text-slate-400"
                    disabled={!slot.college || slot.loadingBranches}
                    value={slot.branchCode}
                    onChange={(event) => changeBranch(index, event.target.value)}
                  >
                    <option value="">{slot.loadingBranches ? `Loading ${admissionRoute} branches...` : "College overview"}</option>
                    {slot.branches.map((branch) => (
                      <option key={branch.branchCode} value={branch.branchCode}>{branch.name}</option>
                    ))}
                  </select>
                </label>
                {slot.prediction ? (
                  <p className="mt-3 inline-flex rounded border border-line bg-panel px-2.5 py-1 text-xs font-medium text-slate-600">
                    Saved from your {admissionRoute} prediction
                  </p>
                ) : null}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-line bg-panel px-4 py-4 md:px-5">
            <button
              className="focus-ring inline-flex min-h-11 items-center gap-2 rounded bg-action px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
              disabled={!hydrated || loading}
              onClick={compareColleges}
            >
              {loading ? <RefreshCw aria-hidden="true" className="animate-spin" size={17} /> : <GitCompareArrows aria-hidden="true" size={18} />}
              {loading ? "Comparing..." : "Compare choices"}
            </button>
            <button
              className="focus-ring inline-flex min-h-11 items-center gap-2 rounded border border-action bg-white px-4 text-sm font-semibold text-action disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              disabled={!hydrated || savingAccount || slots.filter((slot) => slot.college).length < 2}
              onClick={saveToAccount}
            >
              <CloudUpload aria-hidden="true" size={17} /> {savingAccount ? "Saving..." : "Save to my account"}
            </button>
            <p className="text-xs text-slate-500">{admissionRoute} historical information supports research; it does not guarantee allotment.</p>
          </div>
        </section>

        {message ? (
          <div className="mt-4 flex items-start gap-3 rounded-lg border border-warning bg-white p-4 text-sm text-warning" role="alert">
            <AlertCircle aria-hidden="true" className="mt-0.5 shrink-0" size={18} />
            <p>{message}</p>
          </div>
        ) : null}

        {results.length ? (
          <section className="mt-7">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
              <div>
                <p className="text-xs font-semibold uppercase text-action">Comparison results</p>
                <h2 className="mt-1 text-xl font-semibold text-ink">{results.length} choices side by side</h2>
              </div>
              <p className="max-w-xl text-xs leading-5 text-slate-500">
                Historical Demand Index measures previous {admissionRoute} admission demand. It is not an official college ranking.
              </p>
            </div>
            <div className={`mt-4 grid items-start gap-4 ${results.length === 2 ? "lg:grid-cols-2" : "lg:grid-cols-3"}`}>
              {results.map((item, index) => (
                <ComparisonCard key={`${item.instituteCode}-${item.branch?.branchCode || "overview"}`} item={item} position={index + 1} />
              ))}
            </div>
          </section>
        ) : (
          <section className="mt-7 grid gap-4 border-y border-line bg-white px-4 py-8 text-center md:px-6">
            <BarChart3 aria-hidden="true" className="mx-auto text-action" size={26} />
            <div>
              <h2 className="font-semibold text-ink">Your comparison will appear here</h2>
              <p className="mt-1 text-sm text-slate-500">Select at least two {admissionRoute} colleges, then compare their strongest available facts.</p>
            </div>
          </section>
        )}
      </main>
    </>
  );
}
