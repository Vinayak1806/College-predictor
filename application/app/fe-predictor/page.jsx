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
import { explainSeatType } from "../../lib/seatTypes";

const PAGE_SIZE = 10;
const RESULT_MODE = "BEST_BRANCH_PER_COLLEGE";
const fallbackAcademicYears = ["2026-27", "2025-26", "2024-25", "2023-24"];

const defaultForm = {
  percentile: "",
  academicYear: "",
  capRound: "",
  category: "",
  gender: "",
  homeUniversity: "",
  branches: [],
  cities: [],
  collegeTypes: [],
  autonomousOnly: false,
  tfws: false,
  pwd: false,
  defence: false,
  ews: false
};

const zoneFilters = [
  { label: "All", value: "ALL" },
  { label: "Target", value: "TARGET" },
  { label: "Safe", value: "SAFE" },
  { label: "Ambitious", value: "AMBITIOUS" },
  { label: "Highly Ambitious", value: "HIGHLY_AMBITIOUS" }
];

const baseBranchOptions = [
  { label: "Computer / CS / AI / Data Science", value: "Computer" },
  { label: "Computer Engineering", value: "Computer Engineering" },
  { label: "Information Technology", value: "Information Technology" },
  { label: "Artificial Intelligence", value: "Artificial Intelligence" },
  { label: "Data Science", value: "Data Science" },
  { label: "Electronics and Computer Engineering", value: "Electronics and Computer Engineering" },
  { label: "Electronics and Telecommunication", value: "Electronics and Telecommunication" },
  { label: "Mechanical Engineering", value: "Mechanical Engineering" },
  { label: "Civil Engineering", value: "Civil Engineering" },
  { label: "Electrical Engineering", value: "Electrical Engineering" },
  { label: "Chemical Engineering", value: "Chemical Engineering" },
  { label: "Automation and Robotics", value: "Automation and Robotics" },
  { label: "Instrumentation Engineering", value: "Instrumentation Engineering" },
  { label: "Production Engineering", value: "Production Engineering" }
];

const collegeTypeOptions = [
  { label: "Government", value: "GOVERNMENT" },
  { label: "Government-aided", value: "AIDED" },
  { label: "Private / Un-Aided", value: "PRIVATE" }
];

function FilterButton({ active, children, onClick }) {
  return (
    <button
      className={`focus-ring min-h-11 max-w-full shrink-0 rounded-full border px-4 py-2 text-left text-sm font-medium transition-colors duration-200 ${
        active ? "border-action bg-action text-white shadow-sm" : "border-line bg-white text-slate-600 hover:border-action/30 hover:bg-slate-50"
      }`}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function RequiredMark() {
  return <span className="text-danger" aria-hidden="true"> *</span>;
}

function Pagination({ currentPage, totalPages, totalResults, disabled, onPageChange }) {
  if (totalPages <= 1) return null;

  const pageRange = getPageRange(currentPage, PAGE_SIZE, totalResults);

  return (
    <nav
      aria-label="Prediction result pages"
      className="grid gap-3 border-t border-line bg-white px-4 py-4 sm:flex sm:items-center sm:justify-between"
    >
      <p className="text-center text-sm text-slate-600 sm:text-left">
        Options <strong className="text-ink">{pageRange.start}-{pageRange.end}</strong> of{" "}
        <strong className="text-ink">{totalResults}</strong>
      </p>
      <div className="flex items-center justify-center gap-2 sm:hidden">
        <button
          aria-label="Previous results page"
          className="focus-ring flex h-11 w-11 shrink-0 items-center justify-center rounded border border-line bg-white text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          type="button"
          disabled={disabled || currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <ChevronLeft aria-hidden="true" size={19} />
        </button>
        <span className="flex h-11 min-w-28 items-center justify-center rounded border border-line bg-panel px-3 text-sm font-semibold text-ink">
          Page {currentPage} of {totalPages}
        </span>
        <button
          aria-label="Next results page"
          className="focus-ring flex h-11 w-11 shrink-0 items-center justify-center rounded border border-line bg-white text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          type="button"
          disabled={disabled || currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          <ChevronRight aria-hidden="true" size={19} />
        </button>
      </div>
      <div className="hidden min-w-0 items-center justify-center gap-1 sm:flex">
        <button
          aria-label="Previous results page"
          className="focus-ring flex h-11 w-11 shrink-0 items-center justify-center rounded border border-line bg-white text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
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
              aria-label={`Results page ${item}`}
              className={`focus-ring flex h-11 min-w-11 items-center justify-center rounded border px-2 text-sm font-semibold ${
                item === currentPage
                  ? "border-action bg-action text-white"
                  : "border-line bg-white text-slate-700 hover:bg-panel"
              }`}
              type="button"
              disabled={disabled}
              onClick={() => onPageChange(item)}
            >
              {item}
            </button>
          ) : (
            <span key={item} className="flex h-11 min-w-6 items-center justify-center text-slate-400" aria-hidden="true">
              ...
            </span>
          )
        ))}
        <button
          aria-label="Next results page"
          className="focus-ring flex h-11 w-11 shrink-0 items-center justify-center rounded border border-line bg-white text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
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

function selectedSummary(selectedValues, options, emptyText) {
  if (!selectedValues.length) return emptyText;

  const selectedLabels = selectedValues
    .map((value) => options.find((option) => option.value === value)?.label || value)
    .filter(Boolean);

  if (selectedLabels.length === 1) return selectedLabels[0];
  return `${selectedLabels.length} selected`;
}

function CompactMultiSelect({
  label,
  options,
  selectedValues,
  emptyText,
  onToggle,
  onClear,
  loading = false,
  searchPlaceholder = "Type to search",
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
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeWhenClickingOutside);
    return () => document.removeEventListener("pointerdown", closeWhenClickingOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative grid min-w-0 w-full gap-1.5 text-sm h-fit">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-600" htmlFor={inputId}>{label}</label>
        {selectedValues.length ? (
          <button className="text-xs font-semibold text-action hover:underline" type="button" onClick={onClear}>
            Clear ({selectedValues.length})
          </button>
        ) : null}
      </div>

      <div className="focus-within:ring-2 focus-within:ring-action/40 flex min-h-12 w-full min-w-0 max-w-full items-center justify-between gap-2 overflow-hidden rounded-xl border border-line bg-white px-3 py-1.5 shadow-xs transition-all">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {selectedOptions.map((option) => (
            <span
              key={option.value}
              className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 shadow-2xs transition-all hover:bg-indigo-100"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
              <span className="max-w-48 truncate">{option.label}</span>
              <button
                aria-label={`Remove ${option.label}`}
                className="focus-ring -mr-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-indigo-500 hover:bg-indigo-200 hover:text-indigo-900"
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onToggle(option.value);
                }}
              >
                <X aria-hidden="true" size={12} />
              </button>
            </span>
          ))}
          <input
            id={inputId}
            aria-autocomplete="list"
            aria-expanded={open}
            aria-busy={loading}
            autoComplete="off"
            className="min-h-8 min-w-28 flex-1 border-0 bg-transparent p-0 text-sm text-ink outline-none placeholder:text-slate-400"
            disabled={loading}
            placeholder={selectedOptions.length ? "Add more..." : loading ? "Loading..." : searchPlaceholder}
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
        </div>
        <button
          aria-label={open ? `Close ${label}` : `Open ${label}`}
          className="flex h-8 w-6 shrink-0 items-center justify-center text-slate-400 hover:text-slate-700"
          type="button"
          disabled={loading}
          onClick={() => setOpen((current) => !current)}
        >
          {open ? <ChevronUp aria-hidden="true" size={17} /> : <ChevronDown aria-hidden="true" size={17} />}
        </button>
      </div>

      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 rounded-xl border border-slate-200 bg-white p-2 shadow-xl backdrop-blur-md">
          <div className="flex min-h-8 items-center justify-between gap-3 px-2 border-b border-line pb-1.5 mb-1">
            <span className="text-xs font-semibold text-slate-500">
              {selectedValues.length ? `${selectedValues.length} selected` : emptyText}
            </span>
            {selectedValues.length ? (
              <button className="text-xs font-semibold text-action hover:underline" type="button" onClick={onClear}>
                Clear all
              </button>
            ) : null}
          </div>

          <div className="scrollbar-hidden grid max-h-56 gap-1 overflow-y-auto overscroll-contain">
            {matchingOptions.map((option) => {
              const selected = selectedValues.includes(option.value);

              return (
                <button
                  key={option.value}
                  className={`flex min-h-10 items-center justify-between gap-3 rounded-lg px-3 text-left text-xs transition-colors ${
                    selected ? "bg-indigo-50 font-bold text-indigo-900" : "text-slate-700 hover:bg-slate-50"
                  }`}
                  type="button"
                  onClick={() => {
                    onToggle(option.value);
                    setQuery("");
                    setOpen(false);
                  }}
                >
                  <span
                    aria-hidden="true"
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all ${
                      selected ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 bg-white"
                    }`}
                  >
                    {selected ? <Check size={11} strokeWidth={3} /> : null}
                  </span>
                  <span className="min-w-0 flex-1 break-words">{option.label}</span>
                </button>
              );
            })}
            {!matchingOptions.length ? (
              <p className="px-3 py-3 text-xs text-slate-500">{loading ? "Loading options..." : noOptionsText}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function FePredictorPage() {
  const predictorFormRef = useRef(null);
  const resultsTopRef = useRef(null);
  const [form, setForm] = useState(defaultForm);
  const [cities, setCities] = useState([]);
  const [universities, setUniversities] = useState([]);
  const [citiesLoading, setCitiesLoading] = useState(true);
  const [universitiesLoading, setUniversitiesLoading] = useState(true);
  const [cityError, setCityError] = useState("");
  const [universityError, setUniversityError] = useState("");
  const [academicYears, setAcademicYears] = useState(fallbackAcademicYears);
  const [yearRounds, setYearRounds] = useState({});
  const [publishedBranches, setPublishedBranches] = useState([]);
  const [instituteCount, setInstituteCount] = useState(null);
  const [cutoffCount, setCutoffCount] = useState(null);
  const [results, setResults] = useState([]);
  const [selectedZone, setSelectedZone] = useState("ALL");
  const [seatTypes, setSeatTypes] = useState([]);
  const [totalResults, setTotalResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [zoneCounts, setZoneCounts] = useState({});
  const [hasPredicted, setHasPredicted] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [loading, setLoading] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [mobileStep, setMobileStep] = useState(1);
  const branchOptions = [
    ...baseBranchOptions,
    ...publishedBranches
      .filter((branch) => !baseBranchOptions.some((option) => option.value.toLowerCase() === branch.toLowerCase()))
      .map((branch) => ({ label: branch, value: branch }))
  ];

  const percentileNumber = Number(form.percentile);
  const percentileValid = form.percentile !== "" && Number.isFinite(percentileNumber) && percentileNumber >= 0 && percentileNumber <= 100;
  const canPredict = Boolean(percentileValid && form.category && form.gender && form.homeUniversity);

  useEffect(() => {
    const pendingForm = readPendingPredictorForm("FE");
    if (pendingForm) setForm({ ...defaultForm, ...pendingForm });
  }, []);

  useEffect(() => {
    const readJson = async (url) => {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error(`${url} returned ${response.status}`);
      return response.json();
    };
    const normalizeCities = (items) => [...new Map(
      items
        .filter((city) => city?.name)
        .map((city) => [city.name.trim().toLowerCase(), { ...city, name: city.name.trim() }])
    ).values()].sort((left, right) => left.name.localeCompare(right.name));

    async function loadCities() {
      try {
        const data = await readJson("/api/cities?route=FE");
        const nextCities = normalizeCities(data.data || []);
        setCities(nextCities);
        setCityError(nextCities.length ? "" : "City options are temporarily unavailable. Refresh the page to try again.");
      } catch {
        setCityError("City options are temporarily unavailable. Refresh the page to try again.");
      } finally {
        setCitiesLoading(false);
      }
    }

    async function loadUniversities() {
      try {
        const data = await readJson("/api/universities?route=FE");
        const nextUniversities = data.data || [];
        setUniversities(nextUniversities);
        setUniversityError(nextUniversities.length ? "" : "University options are temporarily unavailable. Refresh the page to try again.");
      } catch {
        setUniversityError("University options are temporarily unavailable. Refresh the page to try again.");
      } finally {
        setUniversitiesLoading(false);
      }
    }

    async function loadStats() {
      try {
        const data = await readJson("/api/stats");
        setInstituteCount(data.data?.currentFeInstitutes || data.data?.currentInstitutes || null);
        if (data.data?.verifiedFeCutoffs) {
          setCutoffCount(data.data.verifiedFeCutoffs);
        }
      } catch {
        setInstituteCount(null);
        setCutoffCount(null);
      }
    }

    async function loadCutoffOptions() {
      try {
        const data = await readJson("/api/cutoffs/options?route=FE");
        setAcademicYears(data.years?.length ? data.years : fallbackAcademicYears);
        setYearRounds(data.yearRounds || {});
        setPublishedBranches(data.branches || []);

        const fallbackCities = normalizeCities((data.cities || []).map((name) => ({ id: `cutoff-${name}`, name })));
        if (fallbackCities.length) {
          setCities((current) => current.length ? current : fallbackCities);
          setCityError("");
          setCitiesLoading(false);
        }
      } catch {
        setAcademicYears(fallbackAcademicYears);
        setYearRounds({});
        setPublishedBranches([]);
      }
    }

    async function loadInPriorityOrder() {
      await Promise.allSettled([loadCities(), loadUniversities()]);
      void loadStats();
      void loadCutoffOptions();
    }

    void loadInPriorityOrder();
  }, []);

  function updateField(name, value) {
    setForm((currentForm) => ({
      ...currentForm,
      [name]: value
    }));
  }

  function toggleListValue(field, value) {
    setForm((currentForm) => {
      const currentValues = currentForm[field];
      const nextValues = currentValues.includes(value)
        ? currentValues.filter((item) => item !== value)
        : [...currentValues, value];

      return { ...currentForm, [field]: nextValues };
    });
  }

  function moveToStep(nextStep) {
    if (nextStep > mobileStep) {
      const currentStepValid = mobileStep === 1 ? percentileValid : mobileStep === 2 ? Boolean(form.homeUniversity) : true;
      if (!currentStepValid) {
        setShowValidation(true);
        return;
      }
    }

    setMobileStep(nextStep);
    requestAnimationFrame(() => predictorFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function buildStudentInput(page, zone) {
    return {
      percentile: Number(form.percentile),
      academicYear: form.academicYear || undefined,
      capRound: form.capRound ? Number(form.capRound) : undefined,
      category: form.category.trim().toUpperCase(),
      gender: form.gender,
      homeUniversity: form.homeUniversity,
      preferredBranches: form.branches,
      preferredCities: form.cities,
      collegeTypes: form.collegeTypes,
      autonomousOnly: form.autonomousOnly,
      resultMode: RESULT_MODE,
      zone,
      page,
      pageSize: PAGE_SIZE,
      tfws: form.tfws,
      pwd: form.pwd,
      defence: form.defence,
      ews: form.ews
    };
  }

  async function requestPrediction({
    page = 1,
    zone = selectedZone,
    scrollToResults = true
  } = {}) {
    if (!canPredict) {
      setShowValidation(true);
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/predict/fe", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(buildStudentInput(page, zone))
      });

      const data = await response.json();

      if (!response.ok) {
        setMessageType("error");
        setMessage(data.error || "Prediction failed. Check the form values.");
        return;
      }

      setSeatTypes(data.seatTypes || []);
      setResults(data.results || []);
      setCurrentPage(data.pagination?.page || page);
      setTotalResults(data.pagination?.totalResults || 0);
      setTotalPages(data.pagination?.totalPages || 0);
      setZoneCounts(data.zoneCounts || {});
      setHasPredicted(true);

      if (page === 1 && zone === "ALL") {
        void recordPredictionHistory("FE", form, data.pagination?.totalResults || 0, data.zoneCounts || {});
        trackAnalyticsEvent("prediction_completed", {
          admission_route: "FE",
          result_count: data.pagination?.totalResults || 0,
          branch_filter_count: form.branches.length,
          city_filter_count: form.cities.length,
          ownership_filter_count: form.collegeTypes.length,
          autonomous_only: form.autonomousOnly
        });
      }

      if (!data.results?.length) {
        setMessageType("info");
        setMessage("No matching options found. Try removing a branch, city, or institute filter.");
      }

      if (scrollToResults) {
        requestAnimationFrame(() => {
          resultsTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    } catch (error) {
      setMessageType("error");
      setMessage("Could not connect to the prediction API. Make sure the website server is running.");
    } finally {
      setLoading(false);
    }
  }

  async function submitForm(event) {
    event.preventDefault();
    setSelectedZone("ALL");
    await requestPrediction({ page: 1, zone: "ALL" });
  }

  async function selectZone(zone) {
    setSelectedZone(zone);
    if (hasPredicted) await requestPrediction({ page: 1, zone });
  }

  async function selectPage(page) {
    if (loading || page < 1 || page > totalPages || page === currentPage) return;
    await requestPrediction({ page, zone: selectedZone });
  }

  const [showAllCategories, setShowAllCategories] = useState(false);
  const categoriesList = ["OPEN", "OBC", "SEBC", "SC", "ST", "VJ", "NT1", "NT2", "NT3", "EWS"];
  const visibleCategories = showAllCategories ? categoriesList : categoriesList.slice(0, 6);

  return (
    <>
      <SiteHeader />
      <main className={`page-shell mx-auto grid min-w-0 gap-6 px-4 py-6 sm:px-5 lg:px-6 ${hasPredicted ? "max-w-7xl lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start xl:grid-cols-[380px_minmax(0,1fr)]" : "max-w-6xl"}`}>
        <section className="min-w-0 w-full lg:self-stretch">
          <div className="border-l-4 border-action pl-4">
            <p className="text-xs font-semibold uppercase text-action">First-Year Engineering Admission (FE)</p>
            <h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">First-Year B.E./B.Tech College Predictor</h1>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Find realistic options from verified Maharashtra CAP cutoffs and your official seat eligibility.
            </p>
          </div>

          <CompactMetricGrid
            className="mt-4 grid-cols-3"
            vertical={hasPredicted}
            items={[
              { label: "FE cutoffs", value: cutoffCount ? `${Math.round(cutoffCount / 1000)}k+` : "142k+", icon: BarChart3, tone: "indigo" },
              { label: "Data years", value: academicYears.length || 4, icon: CalendarDays, tone: "success" },
              { label: "Institutes", value: instituteCount ?? "--", icon: Building2, tone: "action" }
            ]}
          />

          <form ref={predictorFormRef} noValidate onSubmit={submitForm} className="surface-card mt-5 grid min-w-0 scroll-mt-20 gap-6 p-5 sm:p-7 rounded-2xl">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-action">College Prediction Engine</span>
              <p className="text-xs text-slate-500"><span className="font-semibold text-danger">*</span> Required fields</p>
            </div>

            {/* SECTION 1 — Your Score */}
            <div className="grid gap-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-action text-xs font-bold text-white shadow-xs">1</span>
                <h2 className="text-base font-bold text-ink">Your Score & Record Period</h2>
              </div>
              <fieldset data-step="1" className="grid min-w-0 gap-4 sm:grid-cols-3">
                <legend className="sr-only">Score and cutoff history</legend>
                <label className="grid min-w-0 gap-1.5 text-sm font-medium text-ink">
                  <span>MHT-CET percentile<RequiredMark /></span>
                  <input
                    aria-invalid={showValidation && !percentileValid}
                    className={`focus-ring min-h-11 w-full min-w-0 rounded-lg border px-3 text-base font-semibold ${showValidation && !percentileValid ? "border-danger bg-red-50/50 text-danger" : "border-line bg-white text-ink"}`}
                    inputMode="decimal"
                    min="0"
                    max="100"
                    step="0.01"
                    type="number"
                    required
                    placeholder="e.g. 89.20"
                    value={form.percentile}
                    onChange={(event) => updateField("percentile", event.target.value)}
                  />
                  {showValidation && !percentileValid ? <span className="text-xs font-normal text-danger">Enter a percentile between 0 and 100.</span> : null}
                </label>

                <label className="grid min-w-0 gap-1.5 text-sm font-medium text-ink">
                  Academic year
                  <select
                    className="focus-ring min-h-11 w-full rounded-lg border border-line bg-white px-3"
                    value={form.academicYear}
                    onChange={(event) => {
                      const newYear = event.target.value;
                      setForm((currentForm) => {
                        const allowedRounds = newYear ? (yearRounds[newYear] || []) : [];
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
                    <option value="">All available years</option>
                    {academicYears.map((year) => <option key={year} value={year}>{year}</option>)}
                  </select>
                </label>

                <label className="grid min-w-0 gap-1.5 text-sm font-medium text-ink">
                  CAP round
                  <select
                    className="focus-ring min-h-11 w-full rounded-lg border border-line bg-white px-3"
                    value={form.capRound}
                    onChange={(event) => updateField("capRound", event.target.value)}
                  >
                    <option value="">Latest available CAP round</option>
                    {(!form.academicYear || (yearRounds[form.academicYear]?.includes(1))) && <option value="1">CAP Round 1</option>}
                    {(!form.academicYear || (yearRounds[form.academicYear]?.includes(2))) && <option value="2">CAP Round 2</option>}
                    {(!form.academicYear || (yearRounds[form.academicYear]?.includes(3))) && <option value="3">CAP Round 3</option>}
                    {(!form.academicYear || (yearRounds[form.academicYear]?.includes(4))) && <option value="4">CAP Round 4</option>}
                  </select>
                </label>
              </fieldset>
            </div>

            <hr className="border-line" />

            {/* SECTION 2 — Your Profile */}
            <div className="grid gap-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-action text-xs font-bold text-white shadow-xs">2</span>
                <h2 className="text-base font-bold text-ink">Your Profile & Seat Category</h2>
              </div>
              <fieldset data-step="2" className="grid min-w-0 gap-5">
                <legend className="sr-only">Admission eligibility</legend>
                <div className="grid min-w-0 gap-2">
                  <label className="text-sm font-medium text-ink">
                    <span>Category<RequiredMark /></span>
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {["OPEN", "OBC", "SEBC", "SC", "ST", "VJ", "NT1", "NT2", "NT3", "EWS"].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        className={`focus-ring min-h-10 rounded-lg border px-3.5 text-xs font-bold transition-all ${
                          form.category === cat
                            ? "border-action bg-action text-white shadow-xs"
                            : "border-line bg-white text-slate-700 hover:border-action/40 hover:bg-slate-50"
                        }`}
                        onClick={() => updateField("category", cat)}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid min-w-0 gap-2">
                    <label className="text-sm font-medium text-ink">
                      <span>Gender<RequiredMark /></span>
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      {[
                        { key: "MALE", label: "Male" },
                        { key: "FEMALE", label: "Female" }
                      ].map(({ key, label }) => {
                        const active = form.gender === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            className={`focus-ring flex min-h-11 items-center gap-2 rounded-lg border px-3.5 text-left text-xs font-bold transition-all ${
                              active
                                ? "border-action bg-action/10 text-action shadow-xs"
                                : "border-line bg-white text-slate-700 hover:bg-slate-50"
                            }`}
                            onClick={() => updateField("gender", key)}
                          >
                            <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-all ${active ? "border-action bg-action text-white" : "border-slate-300 bg-white"}`}>
                              {active ? <Check aria-hidden="true" size={12} /> : null}
                            </span>
                            <span>{label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <label className="grid min-w-0 gap-1.5 text-sm font-medium text-ink">
                    <span>Home university<RequiredMark /></span>
                    <select
                      aria-invalid={showValidation && !form.homeUniversity}
                      aria-busy={universitiesLoading}
                      className={`focus-ring min-h-11 w-full rounded-lg border px-3 ${showValidation && !form.homeUniversity ? "border-danger bg-red-50/50" : "border-line bg-white text-ink"}`}
                      disabled={universitiesLoading || !universities.length}
                      required
                      value={form.homeUniversity}
                      onChange={(event) => updateField("homeUniversity", event.target.value)}
                    >
                      <option value="">
                        {universitiesLoading ? "Loading universities..." : universities.length ? "Select your home university" : "Universities unavailable"}
                      </option>
                      {universities.map((university) => (
                        <option key={university.id} value={university.name}>{university.name}</option>
                      ))}
                    </select>
                    {showValidation && !form.homeUniversity ? <span className="text-xs font-normal text-danger">Select your home university to continue.</span> : null}
                  </label>
                </div>

                <div className="grid gap-2 text-sm">
                  <p className="font-medium text-ink">Special eligibility</p>
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                    {[
                      { key: "tfws", label: "TFWS" },
                      { key: "pwd", label: "PWD" },
                      { key: "defence", label: "DEFENCE" },
                      { key: "ews", label: "EWS" }
                    ].map(({ key, label }) => {
                      const active = form[key];
                      return (
                        <button
                          key={key}
                          type="button"
                          className={`focus-ring flex min-h-11 items-center gap-2 rounded-lg border px-3.5 text-left text-xs font-bold transition-all ${
                            active
                              ? "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-xs"
                              : "border-line bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                          onClick={() => updateField(key, !active)}
                        >
                          <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-all ${active ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 bg-white"}`}>
                            {active ? <Check aria-hidden="true" size={12} /> : null}
                          </span>
                          <span>{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </fieldset>
            </div>

            <hr className="border-line" />

            {/* SECTION 3 — Preferences */}
            <div className="grid gap-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-action text-xs font-bold text-white shadow-xs">3</span>
                <h2 className="text-base font-bold text-ink">Preferences <span className="text-xs font-normal text-slate-500">(Optional)</span></h2>
              </div>
              <fieldset data-step="3" className="grid min-w-0 gap-4 sm:grid-cols-2">
                <legend className="sr-only">College preferences</legend>
                <div className="flex flex-col gap-4">
                  <CompactMultiSelect
                    label="Preferred branches"
                    options={branchOptions}
                    selectedValues={form.branches}
                    emptyText="All branches"
                    onToggle={(value) => toggleListValue("branches", value)}
                    onClear={() => updateField("branches", [])}
                    searchPlaceholder="Type branch name"
                  />

                  <label className="flex min-h-11 items-center gap-2.5 rounded-lg border border-line bg-white px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-action focus:ring-action"
                      checked={form.autonomousOnly}
                      onChange={(event) => updateField("autonomousOnly", event.target.checked)}
                    />
                    Autonomous institutes only
                  </label>
                </div>

                <div className="flex flex-col gap-4">
                  <CompactMultiSelect
                    label="Preferred districts / cities"
                    options={cities.map((city) => ({ label: city.name, value: city.name }))}
                    selectedValues={form.cities}
                    emptyText="All Maharashtra"
                    onToggle={(value) => toggleListValue("cities", value)}
                    onClear={() => updateField("cities", [])}
                    loading={citiesLoading}
                    searchPlaceholder="Type district or city name"
                    noOptionsText={cityError && !cities.length ? cityError : "No matching district or city found."}
                  />

                  <CompactMultiSelect
                    label="Institute ownership"
                    options={collegeTypeOptions}
                    selectedValues={form.collegeTypes}
                    emptyText="All institute types"
                    onToggle={(value) => toggleListValue("collegeTypes", value)}
                    onClear={() => updateField("collegeTypes", [])}
                    searchPlaceholder="Choose institute type"
                  />
                </div>
              </fieldset>
            </div>

            {/* Form Footer */}
            <div className="mt-2 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500">
                {!canPredict ? "Complete the required fields to enable prediction." : "Ready to predict eligible Maharashtra engineering colleges."}
              </p>
              <button
                className="focus-ring flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-action px-6 text-sm font-bold text-white shadow-md hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                disabled={loading || !canPredict}
                type="submit"
              >
                <BarChart3 aria-hidden="true" size={18} />
                {loading ? "Checking First-Year cutoffs..." : "Predict First-Year Colleges"}
              </button>
            </div>
          </form>

          {hasPredicted ? (
            <aside className="surface-card sticky top-20 mt-4 hidden overflow-hidden lg:block">
              <div className="flex items-start justify-between gap-3 p-4">
                <div>
                  <p className="text-xs font-semibold uppercase text-action">Current prediction</p>
                  <p className="mt-1 text-lg font-semibold text-ink">{form.percentile} percentile</p>
                </div>
                <span className="rounded bg-panel px-2 py-1 text-xs font-semibold text-ink">{form.category}</span>
              </div>

              <dl className="grid grid-cols-2 border-y border-line bg-panel">
                <div className="min-w-0 border-r border-line px-4 py-3">
                  <dt className="text-xs text-slate-500">Branch preference</dt>
                  <dd className="mt-1 break-words text-sm font-semibold text-ink">
                    {selectedSummary(form.branches, branchOptions, "All branches")}
                  </dd>
                </div>
                <div className="min-w-0 px-4 py-3">
                  <dt className="text-xs text-slate-500">Location preference</dt>
                  <dd className="mt-1 break-words text-sm font-semibold text-ink">
                    {form.cities.length ? form.cities.join(", ") : "All Maharashtra"}
                  </dd>
                </div>
                <div className="min-w-0 border-r border-t border-line px-4 py-3">
                  <dt className="text-xs text-slate-500">Cutoff year</dt>
                  <dd className="mt-1 text-sm font-semibold text-ink">{form.academicYear || "All years"}</dd>
                </div>
                <div className="min-w-0 border-t border-line px-4 py-3">
                  <dt className="text-xs text-slate-500">CAP round</dt>
                  <dd className="mt-1 text-sm font-semibold text-ink">
                    {form.capRound ? `Round ${form.capRound}` : "Latest comparable"}
                  </dd>
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
                  className="focus-ring mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded border border-action bg-white px-4 text-sm font-semibold text-action hover:bg-cyan-50"
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
                <h2 className="mt-1 text-xl font-semibold">
                  {hasPredicted ? "Your college-branch options" : "Ready for your profile"}
                </h2>
                {hasPredicted ? (
                  <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-lg border border-line bg-panel p-3">
                      <dt className="text-xs font-medium text-slate-500">Percentile</dt>
                      <dd className="mt-1 font-semibold text-ink">{form.percentile}</dd>
                    </div>
                    <div className="rounded-lg border border-line bg-panel p-3">
                      <dt className="text-xs font-medium text-slate-500">Category</dt>
                      <dd className="mt-1 font-semibold text-ink">{form.category}</dd>
                    </div>
                    <div className="min-w-0 rounded-lg border border-line bg-panel p-3">
                      <dt className="text-xs font-medium text-slate-500">Branch preference</dt>
                      <dd className="mt-1 break-words font-semibold text-ink">
                        {selectedSummary(form.branches, branchOptions, "All branches")}
                      </dd>
                    </div>
                    <div className="min-w-0 rounded-lg border border-line bg-panel p-3">
                      <dt className="text-xs font-medium text-slate-500">Location</dt>
                      <dd className="mt-1 break-words font-semibold text-ink">
                        {form.cities.length ? form.cities.join(", ") : "All Maharashtra"}
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                    Complete the required eligibility fields, then run the predictor to see your closest official cutoff matches.
                  </p>
                )}
              </div>
              {hasPredicted ? (
                <div className="min-w-24 shrink-0 border-l-2 border-action pl-3 text-left">
                  <p className="text-2xl font-semibold text-ink">{totalResults}</p>
                  <p className="text-xs uppercase text-slate-500">Matches</p>
                </div>
              ) : null}
            </div>

            {hasPredicted ? (
              <>
                <div className="grid gap-3 border-y border-line bg-panel px-4 py-3 sm:grid-cols-2 md:px-5">
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase text-slate-500">Official seats checked</p>
                    <p className="mt-1 break-words text-sm font-semibold text-ink">
                      {seatTypes.length ? seatTypes.join(", ") : "No eligible seat codes returned"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase text-slate-500">Cutoff history</p>
                    <p className="mt-1 text-sm font-semibold text-ink">
                      {form.academicYear || "All available years"} | {form.capRound ? `CAP Round ${form.capRound}` : "Latest comparable rounds"}
                    </p>
                  </div>
                </div>

                <div className="divide-y divide-line">
                  <div className="grid gap-3 px-4 py-4 lg:grid-cols-[180px_minmax(0,1fr)] lg:items-center md:px-5">
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-500">Admission chance</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">Filter options by their cutoff margin.</p>
                    </div>
                    <div className="scrollbar-hidden flex max-w-full gap-2 overflow-x-auto pb-1 lg:flex-wrap lg:overflow-visible" aria-label="Admission zone filters">
                      {zoneFilters.map((zone) => (
                        <FilterButton
                          key={zone.value}
                          active={selectedZone === zone.value}
                          onClick={() => {
                            if (!loading) selectZone(zone.value);
                          }}
                        >
                          {zone.label} ({zoneCounts[zone.value] || 0})
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
                    {seatTypes.length ? (
                      <details className="relative">
                        <summary className="cursor-pointer font-medium text-action">Seat type meanings</summary>
                        <div className="mt-2 grid gap-2 border-l-2 border-action pl-3 text-sm sm:absolute sm:right-0 sm:z-20 sm:w-80 sm:rounded sm:border sm:border-line sm:bg-white sm:p-3 sm:shadow-lg">
                          {seatTypes.map((seatType) => {
                            const seatTypeInfo = explainSeatType(seatType);
                            return (
                              <p key={seatType} className="text-slate-600">
                                <span className="font-semibold text-ink">{seatTypeInfo.code}</span> - {seatTypeInfo.title}
                              </p>
                            );
                          })}
                        </div>
                      </details>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-5">
                    <p className="text-xs text-slate-500">Signed-in students can keep a named PDF copy of this prediction page.</p>
                    <PredictionReportButton route="FE" form={form} results={results} totalResults={totalResults} />
                  </div>
                </div>
              </>
            ) : (
              <div className="border-t border-line bg-panel px-4 py-5 text-sm text-slate-600 md:px-5">
                Required: MHT-CET percentile, category, gender and home university. Branch and city preferences are optional.
              </div>
            )}
          </div>

          {message ? (
            <div
              role={messageType === "error" ? "alert" : "status"}
              className={`flex items-start gap-3 rounded-lg border bg-white p-4 text-sm ${
                messageType === "error" ? "border-danger text-danger" : "border-warning text-warning"
              }`}
            >
              <AlertCircle aria-hidden="true" className="mt-0.5 shrink-0" size={18} />
              <p>{message}</p>
            </div>
          ) : null}

          <div className={`grid gap-4 transition-opacity ${loading && results.length ? "pointer-events-none opacity-50" : ""}`} aria-busy={loading}>
            {results.map((result, index) => (
              <ResultCard
                key={`${result.college}-${result.branch}-${result.seatType}-${index}`}
                {...result}
              />
            ))}
          </div>

          {loading && !results.length ? (
            <div className="grid gap-3">
              {[1, 2, 3].map((item) => (
                <div key={item} className="shimmer h-64 rounded-xl" />
              ))}
            </div>
          ) : null}

          {hasPredicted && totalPages > 1 ? (
            <div className="overflow-hidden rounded-lg border border-line">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalResults={totalResults}
                disabled={loading}
                onPageChange={selectPage}
              />
            </div>
          ) : null}
        </section>
      </main>
    </>
  );
}
