"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Info,
  SlidersHorizontal,
  X
} from "lucide-react";
import { CompactMetricGrid } from "../../components/CompactMetricGrid";
import { ResultCard } from "../../components/ResultCard";
import { PredictionReportButton } from "../../components/PredictionReportButton";
import { SiteHeader } from "../../components/SiteHeader";
import { trackAnalyticsEvent } from "../../lib/analytics";
import { getPageRange, getPaginationItems } from "../../lib/pagination";
import { readPendingPredictorForm, recordPredictionHistory } from "../../lib/predictorProfiles";

const PAGE_SIZE = 10;
const RESULT_MODE = "BEST_BRANCH_PER_COLLEGE";
const categories = ["OPEN", "SC", "ST", "VJ", "NTA", "NTB", "NTC", "NTD", "OBC", "SEBC"];
const diplomaBranches = [
  "Civil Engineering",
  "Computer Engineering",
  "Electrical Engineering",
  "Electronics and Telecommunication",
  "Information Technology",
  "Mechanical Engineering",
  "Other eligible diploma branch"
];
const zoneFilters = [
  { value: "ALL", label: "All" },
  { value: "TARGET", label: "Target" },
  { value: "SAFE", label: "Safe" },
  { value: "AMBITIOUS", label: "Ambitious" },
  { value: "HIGHLY_AMBITIOUS", label: "Highly Ambitious" }
];
const collegeTypeOptions = [
  { label: "Government", value: "GOVERNMENT" },
  { label: "Government-aided", value: "AIDED" },
  { label: "Private / Un-Aided", value: "PRIVATE" }
];

const initialForm = {
  diplomaPercentage: "",
  meritNumber: "",
  diplomaBranch: "",
  academicYear: "",
  capRound: "",
  category: "OPEN",
  gender: "MALE",
  branches: [],
  cities: [],
  universities: [],
  collegeTypes: [],
  autonomousOnly: false,
  ews: false,
  pwd: false,
  defence: false
};

function RequiredMark() {
  return <span className="text-danger" aria-hidden="true"> *</span>;
}

function FilterButton({ active, children, onClick }) {
  return (
    <button
      className={`focus-ring min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors duration-200 ${
        active ? "border-action bg-action text-white shadow-sm" : "border-line bg-white text-slate-600 hover:border-action/30 hover:bg-slate-50"
      }`}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function selectedSummary(selectedValues, options, emptyText) {
  if (!selectedValues.length) return emptyText;
  if (selectedValues.length === 1) {
    return options.find((option) => option.value === selectedValues[0])?.label || selectedValues[0];
  }
  return `${selectedValues.length} selected`;
}

function CompactMultiSelect({
  label,
  options,
  selectedValues,
  emptyText,
  onToggle,
  onClear,
  loading = false,
  searchPlaceholder,
  noOptionsText = "No matching options found."
}) {
  const inputId = useId();
  const containerRef = useRef(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const matchingOptions = options
    .filter((option) => option.label.toLowerCase().includes(query.trim().toLowerCase()))
    .slice(0, 50);
  const selectedOptions = selectedValues.map((value) => ({
    value,
    label: options.find((option) => option.value === value)?.label || value
  }));

  useEffect(() => {
    function closeWhenClickingOutside(event) {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    }

    document.addEventListener("pointerdown", closeWhenClickingOutside);
    return () => document.removeEventListener("pointerdown", closeWhenClickingOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative grid min-w-0 w-full gap-2 text-sm h-fit">
      <label className="font-medium" htmlFor={inputId}>{label}</label>
      <div className="focus-within:ring-2 focus-within:ring-[#7db9ca] flex min-h-11 items-center gap-2 overflow-hidden rounded border border-line bg-white px-3">
        <input
          id={inputId}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-busy={loading}
          autoComplete="off"
          className="min-h-10 w-0 min-w-0 flex-1 border-0 bg-transparent p-0 text-sm outline-none"
          disabled={loading}
          placeholder={loading ? "Loading options..." : searchPlaceholder}
          role="combobox"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
          }}
        />
        <button
          aria-label={open ? `Close ${label}` : `Open ${label}`}
          className="flex h-10 w-8 shrink-0 items-center justify-center"
          type="button"
          disabled={loading}
          onClick={() => setOpen((current) => !current)}
        >
          {open ? <ChevronUp aria-hidden="true" size={17} /> : <ChevronDown aria-hidden="true" size={17} />}
        </button>
      </div>

      {selectedOptions.length ? (
        <div className="flex flex-wrap gap-2" aria-label={`Selected ${label.toLowerCase()}`}>
          {selectedOptions.map((option) => (
            <div key={option.value} className="flex min-h-9 max-w-full items-center gap-2 border border-line bg-panel px-2 text-xs text-ink">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center border border-action bg-white text-action">
                <Check aria-hidden="true" size={14} strokeWidth={2.5} />
              </span>
              <span className="min-w-0 break-words font-medium">{option.label}</span>
              <button
                aria-label={`Remove ${option.label}`}
                className="focus-ring flex h-7 w-7 shrink-0 items-center justify-center text-slate-500 hover:bg-white hover:text-danger"
                type="button"
                onClick={() => onToggle(option.value)}
              >
                <X aria-hidden="true" size={15} />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {open ? (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 rounded border border-line bg-white p-2 shadow-lg">
          <div className="flex min-h-9 items-center justify-between gap-3 px-1">
            <span className="text-xs text-slate-600">
              {selectedValues.length ? `${selectedValues.length} selected` : emptyText}
            </span>
            {selectedValues.length ? (
              <button className="text-xs font-medium text-action underline" type="button" onClick={onClear}>
                Clear
              </button>
            ) : null}
          </div>
          <div className="scrollbar-hidden grid max-h-52 gap-1 overflow-y-auto overscroll-contain">
            {matchingOptions.map((option) => {
              const selected = selectedValues.includes(option.value);
              return (
                <button
                  key={option.value}
                  className={`flex min-h-11 items-center gap-3 rounded px-3 text-left hover:bg-panel ${
                    selected ? "bg-panel font-medium text-ink" : "text-slate-700"
                  }`}
                  type="button"
                  onClick={() => {
                    onToggle(option.value);
                    setQuery("");
                  }}
                >
                  <span
                    aria-hidden="true"
                    className={`flex h-5 w-5 shrink-0 items-center justify-center border ${
                      selected ? "border-action bg-action text-white" : "border-slate-300 bg-white"
                    }`}
                  >
                    {selected ? <Check size={14} strokeWidth={2.5} /> : null}
                  </span>
                  <span className="min-w-0 flex-1 break-words">{option.label}</span>
                </button>
              );
            })}
            {!matchingOptions.length ? (
              <p className="px-3 py-3 text-slate-600">{loading ? "Loading options..." : noOptionsText}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Pagination({ currentPage, totalPages, totalResults, disabled, onPageChange }) {
  if (totalPages <= 1) return null;
  const pageRange = getPageRange(currentPage, PAGE_SIZE, totalResults);

  return (
    <nav aria-label="DSE prediction result pages" className="grid gap-3 border-t border-line bg-white px-4 py-4 sm:flex sm:items-center sm:justify-between">
      <p className="text-center text-sm text-slate-600 sm:text-left">
        Options <strong className="text-ink">{pageRange.start}-{pageRange.end}</strong> of{" "}
        <strong className="text-ink">{totalResults}</strong>
      </p>
      <div className="flex items-center justify-center gap-2 sm:hidden">
        <button
          aria-label="Previous results page"
          className="focus-ring flex h-11 w-11 items-center justify-center rounded border border-line bg-white disabled:opacity-40"
          type="button"
          disabled={disabled || currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <ChevronLeft aria-hidden="true" size={19} />
        </button>
        <span className="flex h-11 min-w-28 items-center justify-center rounded border border-line bg-panel px-3 text-sm font-semibold">
          Page {currentPage} of {totalPages}
        </span>
        <button
          aria-label="Next results page"
          className="focus-ring flex h-11 w-11 items-center justify-center rounded border border-line bg-white disabled:opacity-40"
          type="button"
          disabled={disabled || currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          <ChevronRight aria-hidden="true" size={19} />
        </button>
      </div>
      <div className="hidden items-center justify-center gap-1 sm:flex">
        <button
          aria-label="Previous results page"
          className="focus-ring flex h-11 w-11 items-center justify-center rounded border border-line bg-white disabled:opacity-40"
          type="button"
          disabled={disabled || currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <ChevronLeft aria-hidden="true" size={19} />
        </button>
        {getPaginationItems(currentPage, totalPages).map((item) => (
          typeof item === "number" ? (
            <button
              key={item}
              aria-current={item === currentPage ? "page" : undefined}
              className={`focus-ring flex h-11 min-w-11 items-center justify-center rounded border px-2 text-sm font-semibold ${
                item === currentPage ? "border-action bg-action text-white" : "border-line bg-white hover:bg-panel"
              }`}
              type="button"
              disabled={disabled}
              onClick={() => onPageChange(item)}
            >
              {item}
            </button>
          ) : <span key={item} className="px-1 text-slate-400" aria-hidden="true">...</span>
        ))}
        <button
          aria-label="Next results page"
          className="focus-ring flex h-11 w-11 items-center justify-center rounded border border-line bg-white disabled:opacity-40"
          type="button"
          disabled={disabled || currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          <ChevronRight aria-hidden="true" size={19} />
        </button>
      </div>
    </nav>
  );
}

export default function DsePredictorPage() {
  const predictorFormRef = useRef(null);
  const resultsTopRef = useRef(null);
  const [form, setForm] = useState(initialForm);
  const [options, setOptions] = useState({ years: [], rounds: [], branches: [], cities: [], universities: [], yearRounds: {} });
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [instituteCount, setInstituteCount] = useState(null);
  const [zone, setZone] = useState("ALL");
  const [results, setResults] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [zoneCounts, setZoneCounts] = useState({});
  const [seatTypes, setSeatTypes] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [hasPredicted, setHasPredicted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showValidation, setShowValidation] = useState(false);
  const [mobileStep, setMobileStep] = useState(1);

  const percentage = Number(form.diplomaPercentage);
  const percentageValid = form.diplomaPercentage !== "" && Number.isFinite(percentage) && percentage >= 0 && percentage <= 100;
  const canPredict = percentageValid && Boolean(form.diplomaBranch && form.category && form.gender);
  const branchOptions = options.branches.map((branch) => ({ label: branch, value: branch }));
  const cityOptions = options.cities.map((city) => ({ label: city, value: city }));
  const universityOptions = options.universities.map((university) => ({ label: university, value: university }));
  const totalResults = pagination?.totalResults || 0;
  const currentPage = pagination?.page || 1;
  const totalPages = pagination?.totalPages || 0;

  useEffect(() => {
    const pendingForm = readPendingPredictorForm("DSE");
    if (pendingForm) setForm({ ...initialForm, ...pendingForm });
  }, []);

  useEffect(() => {
    setOptionsLoading(true);
    fetch("/api/cutoffs/options?route=DSE")
      .then((response) => {
        if (!response.ok) throw new Error("DSE options request failed.");
        return response.json();
      })
      .then((data) => {
        setOptions({
          years: data.years || [],
          rounds: data.rounds || [],
          branches: data.branches || [],
          cities: data.cities || [],
          universities: data.universities || [],
          yearRounds: data.yearRounds || {}
        });
        setOptionsLoading(false);
      })
      .catch(() => {
        setOptionsLoading(false);
        setError("DSE filter options could not be loaded. Refresh the page to try again.");
      });

    fetch("/api/stats")
      .then((response) => response.json())
      .then((stats) => setInstituteCount(stats.data?.currentDseInstitutes || stats.data?.currentInstitutes || null))
      .catch(() => setInstituteCount(null));
  }, []);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function toggleListValue(field, value) {
    setForm((current) => ({
      ...current,
      [field]: current[field].includes(value)
        ? current[field].filter((item) => item !== value)
        : [...current[field], value]
    }));
  }

  function moveToStep(step) {
    if (step === 2 && (!percentageValid || !form.diplomaBranch)) {
      setShowValidation(true);
      return;
    }
    setMobileStep(step);
  }

  async function predict(page = 1, nextZone = zone) {
    setShowValidation(true);
    if (!canPredict) {
      setError("Complete the required DSE fields before predicting colleges.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/predict/dse", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          diplomaPercentage: percentage,
          meritNumber: form.meritNumber ? Number(form.meritNumber) : undefined,
          diplomaBranch: form.diplomaBranch,
          academicYear: form.academicYear || undefined,
          capRound: form.capRound ? Number(form.capRound) : undefined,
          category: form.category,
          gender: form.gender,
          preferredBranches: form.branches,
          preferredCities: form.cities,
          preferredUniversities: form.universities,
          collegeTypes: form.collegeTypes,
          autonomousOnly: form.autonomousOnly,
          resultMode: RESULT_MODE,
          zone: nextZone,
          page,
          pageSize: PAGE_SIZE,
          tfws: false,
          ews: form.ews,
          pwd: form.pwd,
          defence: form.defence
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "DSE prediction failed.");

      setResults(data.results || []);
      setPagination(data.pagination || null);
      setZoneCounts(data.zoneCounts || {});
      setSeatTypes(data.seatTypes || []);
      setAnalysis(data.analysis || null);
      setHasPredicted(true);
      if (page === 1 && nextZone === "ALL") {
        void recordPredictionHistory("DSE", form, data.pagination?.totalResults || 0, data.zoneCounts || {});
        trackAnalyticsEvent("prediction_completed", {
          admission_route: "DSE",
          result_count: data.pagination?.totalResults || 0,
          branch_filter_count: form.branches.length,
          city_filter_count: form.cities.length,
          university_filter_count: form.universities.length,
          ownership_filter_count: form.collegeTypes.length,
          autonomous_only: form.autonomousOnly
        });
      }
      requestAnimationFrame(() => resultsTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  function changeZone(value) {
    setZone(value);
    if (hasPredicted) predict(1, value);
  }

  return (
    <>
      <SiteHeader />
      <main className={`page-shell mx-auto grid min-w-0 gap-6 px-4 py-6 sm:px-5 lg:px-6 ${hasPredicted ? "max-w-7xl lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start xl:grid-cols-[360px_minmax(0,1fr)]" : "max-w-6xl"}`}>
        <section className="min-w-0 w-full lg:self-stretch">
          <header className="border-l-4 border-action pl-4">
            <p className="text-xs font-semibold uppercase text-action">Direct Second-Year Engineering Admission (DSE)</p>
            <h1 className="mt-1 text-2xl font-semibold text-ink">Direct Second-Year B.E./B.Tech College Predictor</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Find realistic lateral-entry options using verified Maharashtra Direct Second-Year CAP cutoffs.
            </p>
          </header>

          <CompactMetricGrid
            className="mt-4 grid-cols-3"
            vertical={hasPredicted}
            items={[
              { label: "DSE cutoffs", value: "45k+", icon: BarChart3, tone: "indigo" },
              { label: "Data years", value: options.years.length || 2, icon: CalendarDays, tone: "success" },
              { label: "Institutes", value: instituteCount || "...", icon: Building2, tone: "action" }
            ]}
          />

          <form
            ref={predictorFormRef}
            className="surface-card mt-4 grid min-w-0 gap-5 p-4 sm:p-5"
            onSubmit={(event) => {
              event.preventDefault();
              predict(1);
            }}
          >
            <p className="text-right text-xs text-slate-500"><RequiredMark /> Required</p>
            <div className="md:hidden">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                <span>Step {mobileStep} of 3</span>
                <span>{mobileStep === 1 ? "Score" : mobileStep === 2 ? "Eligibility" : "Preferences"}</span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-1">
                {[1, 2, 3].map((step) => (
                  <span key={step} className={`h-1.5 ${step <= mobileStep ? "bg-action" : "bg-slate-200"}`} />
                ))}
              </div>
            </div>

            <fieldset className={`${mobileStep === 1 ? "grid" : "hidden"} min-w-0 gap-4 md:grid ${hasPredicted ? "" : "md:grid-cols-2 xl:grid-cols-4"}`}>
              <legend className="sr-only">Diploma score and cutoff history</legend>
              <label className="grid min-w-0 gap-2 text-sm font-medium">
                <span>Diploma percentage<RequiredMark /></span>
                <input
                  aria-invalid={showValidation && !percentageValid}
                  className={`focus-ring min-h-11 w-full rounded border px-3 ${showValidation && !percentageValid ? "border-danger" : "border-line"}`}
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="Example: 89.20"
                  value={form.diplomaPercentage}
                  onChange={(event) => update("diplomaPercentage", event.target.value)}
                />
                {showValidation && !percentageValid ? (
                  <span className="text-xs font-normal text-danger">Enter a percentage between 0 and 100.</span>
                ) : null}
              </label>

              <label className="grid min-w-0 gap-2 text-sm font-medium">
                <span>Direct Second-Year merit number <span className="font-normal text-slate-500">(optional)</span></span>
                <input
                  className="focus-ring min-h-11 w-full rounded border border-line px-3"
                  type="number"
                  min="1"
                  placeholder="General merit number"
                  value={form.meritNumber}
                  onChange={(event) => update("meritNumber", event.target.value)}
                />
              </label>

              <label className="grid min-w-0 gap-2 text-sm font-medium">
                <span>Diploma branch<RequiredMark /></span>
                <select
                  aria-invalid={showValidation && !form.diplomaBranch}
                  className={`focus-ring min-h-11 w-full rounded border px-3 ${showValidation && !form.diplomaBranch ? "border-danger" : "border-line"}`}
                  value={form.diplomaBranch}
                  onChange={(event) => update("diplomaBranch", event.target.value)}
                >
                  <option value="">Select your diploma branch</option>
                  {diplomaBranches.map((branch) => <option key={branch}>{branch}</option>)}
                </select>
                {showValidation && !form.diplomaBranch ? (
                  <span className="text-xs font-normal text-danger">Select your diploma branch.</span>
                ) : null}
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="grid min-w-0 gap-2 text-sm font-medium">
                  Cutoff year
                  <select
                    className="focus-ring min-h-11 min-w-0 rounded border border-line px-2"
                    value={form.academicYear}
                    onChange={(event) => {
                      const newYear = event.target.value;
                      setForm((currentForm) => {
                        const allowedRounds = newYear ? (options.yearRounds[newYear] || []) : [];
                        const capRound = currentForm.capRound;
                        const nextCapRound = (newYear && capRound && !allowedRounds.includes(Number(capRound)))
                          ? ""
                          : capRound;
                        return {
                          ...currentForm,
                          academicYear: newYear,
                          capRound: nextCapRound
                        };
                      });
                    }}
                  >
                    <option value="">All years</option>
                    {options.years.map((year) => <option key={year}>{year}</option>)}
                  </select>
                </label>
                <label className="grid min-w-0 gap-2 text-sm font-medium">
                  CAP round
                  <select
                    className="focus-ring min-h-11 min-w-0 rounded border border-line px-2"
                    value={form.capRound}
                    onChange={(event) => update("capRound", event.target.value)}
                  >
                    <option value="">Latest round</option>
                    {options.rounds
                      .filter((round) => !form.academicYear || options.yearRounds[form.academicYear]?.includes(Number(round)))
                      .map((round) => <option key={round} value={round}>Round {round}</option>)
                    }
                  </select>
                </label>
              </div>
            </fieldset>

            <fieldset className={`${mobileStep === 2 ? "grid" : "hidden"} min-w-0 gap-4 md:grid md:border-t md:border-line md:pt-5 ${hasPredicted ? "" : "md:grid-cols-2"}`}>
              <legend className="sr-only">Admission eligibility</legend>
              <div className="grid grid-cols-2 gap-2">
                <label className="grid min-w-0 gap-2 text-sm font-medium">
                  <span>Category<RequiredMark /></span>
                  <select className="focus-ring min-h-11 min-w-0 rounded border border-line px-2" value={form.category} onChange={(event) => update("category", event.target.value)}>
                    {categories.map((category) => <option key={category}>{category}</option>)}
                  </select>
                </label>
                <label className="grid min-w-0 gap-2 text-sm font-medium">
                  <span>Gender<RequiredMark /></span>
                  <select className="focus-ring min-h-11 min-w-0 rounded border border-line px-2" value={form.gender} onChange={(event) => update("gender", event.target.value)}>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-2 text-sm">
                <p className="font-medium">Special eligibility</p>
                <div className={`grid grid-cols-2 gap-2 ${hasPredicted ? "" : "xl:grid-cols-3"}`}>
                  {["ews", "pwd", "defence"].map((name) => (
                    <label key={name} className="flex min-h-11 items-center gap-2 rounded border border-line px-3">
                      <input type="checkbox" checked={form[name]} onChange={(event) => update(name, event.target.checked)} />
                      <span className="text-xs font-medium">{name.toUpperCase()}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className={`flex gap-2 border border-line bg-panel p-3 text-xs leading-5 text-slate-600 ${hasPredicted ? "" : "md:col-span-2"}`}>
                <Info className="mt-0.5 shrink-0 text-action" aria-hidden="true" size={16} />
                <p>DSE CAP records use state-level seat eligibility, so a home-university field is not required here.</p>
              </div>
            </fieldset>

            <fieldset className={`${mobileStep === 3 ? "grid" : "hidden"} min-w-0 gap-4 md:grid md:border-t md:border-line md:pt-5 ${hasPredicted ? "" : "md:grid-cols-2"}`}>
              <legend className="sr-only">College preferences</legend>
              <div className="flex flex-col gap-4">
                <CompactMultiSelect
                  label="Preferred B.E./B.Tech branches"
                  options={branchOptions}
                  selectedValues={form.branches}
                  emptyText="All degree branches"
                  onToggle={(value) => toggleListValue("branches", value)}
                  onClear={() => update("branches", [])}
                  loading={optionsLoading}
                  searchPlaceholder="Type branch name"
                />
                <CompactMultiSelect
                  label={`Preferred universities${optionsLoading ? "" : ` (${options.universities.length})`}`}
                  options={universityOptions}
                  selectedValues={form.universities}
                  emptyText="All universities"
                  onToggle={(value) => toggleListValue("universities", value)}
                  onClear={() => update("universities", [])}
                  loading={optionsLoading}
                  searchPlaceholder="Type university name"
                  noOptionsText="No matching university found."
                />
                <label className="flex min-h-11 items-center gap-2 rounded border border-line px-3 text-sm font-medium">
                  <input type="checkbox" checked={form.autonomousOnly} onChange={(event) => update("autonomousOnly", event.target.checked)} />
                  Autonomous institutes only
                </label>
              </div>

              <div className="flex flex-col gap-4">
                <CompactMultiSelect
                  label={`Preferred districts / cities${optionsLoading ? "" : ` (${options.cities.length})`}`}
                  options={cityOptions}
                  selectedValues={form.cities}
                  emptyText="All Maharashtra"
                  onToggle={(value) => toggleListValue("cities", value)}
                  onClear={() => update("cities", [])}
                  loading={optionsLoading}
                  searchPlaceholder="Type district or city"
                  noOptionsText="No matching district or city found."
                />
                <CompactMultiSelect
                  label="Institute ownership"
                  options={collegeTypeOptions}
                  selectedValues={form.collegeTypes}
                  emptyText="All institute types"
                  onToggle={(value) => toggleListValue("collegeTypes", value)}
                  onClear={() => update("collegeTypes", [])}
                  searchPlaceholder="Choose institute type"
                />
              </div>
            </fieldset>

            <div className="grid grid-cols-2 gap-2 md:hidden">
              <button
                className="focus-ring flex min-h-11 items-center justify-center gap-2 rounded border border-line px-3 text-sm font-semibold disabled:opacity-40"
                type="button"
                disabled={mobileStep === 1}
                onClick={() => moveToStep(mobileStep - 1)}
              >
                <ArrowLeft aria-hidden="true" size={17} /> Back
              </button>
              {mobileStep < 3 ? (
                <button className="focus-ring flex min-h-11 items-center justify-center gap-2 rounded bg-action px-3 text-sm font-semibold text-white" type="button" onClick={() => moveToStep(mobileStep + 1)}>
                  Continue <ArrowRight aria-hidden="true" size={17} />
                </button>
              ) : <span />}
            </div>

            <button
              className={`${mobileStep === 3 ? "flex" : "hidden"} focus-ring min-h-11 items-center justify-center gap-2 rounded bg-action px-5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 md:flex ${hasPredicted ? "w-full" : "w-full md:ml-auto md:w-auto md:min-w-64"}`}
              disabled={!canPredict || loading}
            >
              <BarChart3 aria-hidden="true" size={18} /> {loading ? "Checking Direct Second-Year cutoffs..." : "Predict Direct Second-Year Colleges"}
            </button>
            {!canPredict ? <p className="text-center text-xs text-slate-500">Complete the required fields to enable prediction.</p> : null}
          </form>

          {hasPredicted ? (
            <aside className="surface-card sticky top-20 mt-4 hidden overflow-hidden lg:block">
              <div className="flex items-start justify-between gap-3 p-4">
                <div>
                  <p className="text-xs font-semibold uppercase text-action">Current Direct Second-Year profile</p>
                  <p className="mt-1 text-lg font-semibold text-ink">{form.diplomaPercentage}% diploma</p>
                </div>
                <span className="rounded bg-panel px-2 py-1 text-xs font-semibold">{form.category}</span>
              </div>
              <dl className="grid grid-cols-2 border-y border-line bg-panel">
                <div className="min-w-0 border-r border-line px-4 py-3">
                  <dt className="text-xs text-slate-500">Diploma branch</dt>
                  <dd className="mt-1 break-words text-sm font-semibold">{form.diplomaBranch}</dd>
                </div>
                <div className="min-w-0 px-4 py-3">
                  <dt className="text-xs text-slate-500">Degree branches</dt>
                  <dd className="mt-1 break-words text-sm font-semibold">{selectedSummary(form.branches, branchOptions, "All branches")}</dd>
                </div>
                <div className="min-w-0 border-r border-t border-line px-4 py-3">
                  <dt className="text-xs text-slate-500">Cutoff year</dt>
                  <dd className="mt-1 text-sm font-semibold">{form.academicYear || "All years"}</dd>
                </div>
                <div className="min-w-0 border-t border-line px-4 py-3">
                  <dt className="text-xs text-slate-500">CAP round</dt>
                  <dd className="mt-1 text-sm font-semibold">{form.capRound ? `Round ${form.capRound}` : "Latest comparable"}</dd>
                </div>
                <div className="col-span-2 min-w-0 border-t border-line px-4 py-3">
                  <dt className="text-xs text-slate-500">University preference</dt>
                  <dd className="mt-1 break-words text-sm font-semibold">{selectedSummary(form.universities, universityOptions, "All universities")}</dd>
                </div>
              </dl>
              <div className="p-4">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase text-slate-500">Results</p>
                    <p className="mt-1 text-sm text-slate-600">{totalResults} college-branch options</p>
                  </div>
                  <p className="text-xs text-slate-500">Page {currentPage}/{totalPages}</p>
                </div>
                <button
                  className="focus-ring mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded border border-action text-sm font-semibold text-action hover:bg-cyan-50"
                  type="button"
                  onClick={() => predictorFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                >
                  <SlidersHorizontal aria-hidden="true" size={17} /> Edit prediction
                </button>
              </div>
            </aside>
          ) : null}
        </section>

        <section ref={resultsTopRef} className={`min-w-0 scroll-mt-20 content-start gap-4 ${hasPredicted ? "grid" : "hidden"}`}>
          <div className="surface-card overflow-hidden">
            <div className={`grid items-start gap-4 p-4 md:p-5 ${hasPredicted ? "md:grid-cols-[minmax(0,1fr)_96px]" : ""}`}>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase text-action">Prediction workspace</p>
                <h2 className="mt-1 text-xl font-semibold">{hasPredicted ? "Your college-branch options" : "Ready for your profile"}</h2>
                {hasPredicted ? (
                  <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-5">
                    <div className="rounded-lg border border-line bg-panel p-3">
                      <dt className="text-xs font-medium text-slate-500">Diploma percentage</dt>
                      <dd className="mt-1 font-semibold text-ink">{form.diplomaPercentage}%</dd>
                    </div>
                    <div className="rounded-lg border border-line bg-panel p-3">
                      <dt className="text-xs font-medium text-slate-500">Category</dt>
                      <dd className="mt-1 font-semibold text-ink">{form.category}</dd>
                    </div>
                    <div className="min-w-0 rounded-lg border border-line bg-panel p-3">
                      <dt className="text-xs font-medium text-slate-500">Degree branch preference</dt>
                      <dd className="mt-1 break-words font-semibold text-ink">{selectedSummary(form.branches, branchOptions, "All branches")}</dd>
                    </div>
                    <div className="min-w-0 rounded-lg border border-line bg-panel p-3">
                      <dt className="text-xs font-medium text-slate-500">Location</dt>
                      <dd className="mt-1 break-words font-semibold text-ink">{form.cities.length ? form.cities.join(", ") : "All Maharashtra"}</dd>
                    </div>
                    <div className="min-w-0 rounded-lg border border-line bg-panel p-3">
                      <dt className="text-xs font-medium text-slate-500">University</dt>
                      <dd className="mt-1 break-words font-semibold text-ink">{selectedSummary(form.universities, universityOptions, "All universities")}</dd>
                    </div>
                  </dl>
                ) : (
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                    Add your diploma score and eligibility details to find matches from official Direct Second-Year CAP records.
                  </p>
                )}
              </div>
              {hasPredicted ? (
                <div className="min-w-24 border-l-2 border-action pl-3">
                  <p className="text-2xl font-semibold">{totalResults}</p>
                  <p className="text-xs uppercase text-slate-500">Matches</p>
                </div>
              ) : null}
            </div>

            {hasPredicted ? (
              <>
                <div className="grid gap-3 border-y border-line bg-panel px-4 py-3 sm:grid-cols-2 md:px-5">
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase text-slate-500">Official Direct Second-Year seats checked</p>
                    <p className="mt-1 break-words text-sm font-semibold">{seatTypes.length ? seatTypes.join(", ") : "No eligible seat codes returned"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase text-slate-500">Cutoff history</p>
                    <p className="mt-1 text-sm font-semibold">
                      {analysis?.selectedYear || form.academicYear || "All available years"} | {form.capRound ? `CAP Round ${form.capRound}` : "Latest comparable rounds"}
                    </p>
                  </div>
                </div>

                <div className="divide-y divide-line">
                  <div className="grid gap-3 px-4 py-4 lg:grid-cols-[180px_minmax(0,1fr)] lg:items-center md:px-5">
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-500">Admission chance</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">Filter options by their diploma cutoff margin.</p>
                    </div>
                    <div className="scrollbar-hidden flex max-w-full gap-2 overflow-x-auto pb-1 lg:flex-wrap lg:overflow-visible">
                      {zoneFilters.map((item) => (
                        <FilterButton key={item.value} active={zone === item.value} onClick={() => !loading && changeZone(item.value)}>
                          {item.label} ({zoneCounts[item.value] || 0})
                        </FilterButton>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 bg-panel px-4 py-3 text-xs text-slate-500 md:px-5">
                    <p>
                      {totalResults
                        ? `Target first, then Safe and Ambitious | Page ${currentPage} of ${totalPages} | ${getPageRange(currentPage, PAGE_SIZE, totalResults).start}-${getPageRange(currentPage, PAGE_SIZE, totalResults).end} shown`
                        : "No options in this admission zone."}
                    </p>
                    <details>
                      <summary className="cursor-pointer font-medium text-action">Direct Second-Year data note</summary>
                      <p className="mt-2 max-w-xl leading-5 text-slate-600">{analysis?.diplomaBranchNote}</p>
                    </details>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-5">
                    <p className="text-xs text-slate-500">Signed-in students can keep a named PDF copy of this prediction page.</p>
                    <PredictionReportButton route="DSE" form={form} results={results} totalResults={totalResults} />
                  </div>
                </div>
              </>
            ) : (
              <div className="border-t border-line bg-panel px-4 py-5 text-sm text-slate-600 md:px-5">
                Required: diploma percentage, diploma branch, category and gender. Degree branch and city preferences are optional.
              </div>
            )}
          </div>

          {error ? (
            <div className="flex items-start gap-2 rounded border border-danger bg-red-50 p-4 text-sm text-danger">
              <AlertCircle aria-hidden="true" size={18} />
              <p>{error}</p>
            </div>
          ) : null}

          <div className="grid gap-4">
            {results.map((result) => (
              <ResultCard
                key={`${result.instituteCode}-${result.branchCode}-${result.seatType}`}
                {...result}
              />
            ))}
          </div>

          {hasPredicted && !loading && !results.length ? (
            <div className="rounded-lg border border-line bg-white p-6 text-center">
              <p className="font-semibold">No matches in this view</p>
              <p className="mt-2 text-sm text-slate-600">Try another admission zone or remove an optional preference.</p>
            </div>
          ) : null}

          {hasPredicted ? (
            <div className="overflow-hidden rounded-lg border border-line">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalResults={totalResults}
                disabled={loading}
                onPageChange={(page) => predict(page)}
              />
            </div>
          ) : null}
        </section>
      </main>
    </>
  );
}
