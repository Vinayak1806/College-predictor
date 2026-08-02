"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  SlidersHorizontal,
  X
} from "lucide-react";
import { ResultCard } from "../../components/ResultCard";
import { PredictorProfileBar } from "../../components/PredictorProfileBar";
import { SiteHeader } from "../../components/SiteHeader";
import { getPageRange, getPaginationItems } from "../../lib/pagination";
import { readPendingPredictorForm, recordPredictionHistory } from "../../lib/predictorProfiles";
import { explainSeatType } from "../../lib/seatTypes";

const PAGE_SIZE = 10;
const RESULT_MODE = "BEST_BRANCH_PER_COLLEGE";

const defaultForm = {
  percentile: "89.20",
  academicYear: "",
  capRound: "",
  category: "OBC",
  gender: "MALE",
  homeUniversity: "",
  branches: ["Computer"],
  cities: ["Pune"],
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

const branchOptions = [
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
      className={`focus-ring min-h-11 max-w-full shrink-0 rounded border px-3 py-2 text-left text-sm font-medium ${
        active ? "border-action bg-action text-white" : "border-line bg-white text-slate-700"
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

  useEffect(() => {
    const pendingForm = readPendingPredictorForm("FE");
    if (pendingForm) setForm({ ...defaultForm, ...pendingForm });
  }, []);

  return (
    <div ref={containerRef} className="relative grid min-w-0 w-full gap-2 text-sm">
      <label className="font-medium" htmlFor={inputId}>{label}</label>
      <div className="focus-within:ring-2 focus-within:ring-[#7db9ca] flex min-h-11 w-full min-w-0 max-w-full items-center gap-2 overflow-hidden rounded border border-line bg-white px-3">
        <input
          id={inputId}
          aria-autocomplete="list"
          aria-expanded={open}
          autoComplete="off"
          className="min-h-10 w-0 min-w-0 flex-1 border-0 bg-transparent p-0 text-sm outline-none"
          placeholder={searchPlaceholder}
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
          onClick={() => setOpen((current) => !current)}
        >
          {open ? <ChevronUp aria-hidden="true" size={17} /> : <ChevronDown aria-hidden="true" size={17} />}
        </button>
      </div>

      {selectedOptions.length ? (
        <div className="flex flex-wrap gap-2" aria-label={`Selected ${label.toLowerCase()}`}>
          {selectedOptions.map((option) => (
            <div
              key={option.value}
              className="flex min-h-9 max-w-full items-center gap-2 border border-line bg-panel px-2 text-xs text-ink"
            >
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
                  className={`flex min-h-11 items-center justify-between gap-3 rounded px-3 text-left hover:bg-panel ${
                    selected ? "bg-panel font-medium text-ink" : "text-slate-700"
                  }`}
                  type="button"
                  onClick={() => {
                    onToggle(option.value);
                    setQuery("");
                    setOpen(true);
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
            {!matchingOptions.length ? <p className="px-3 py-3 text-slate-600">{noOptionsText}</p> : null}
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
  const [instituteCount, setInstituteCount] = useState(null);
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

  const percentileNumber = Number(form.percentile);
  const percentileValid = form.percentile !== "" && Number.isFinite(percentileNumber) && percentileNumber >= 0 && percentileNumber <= 100;
  const canPredict = Boolean(percentileValid && form.category && form.gender && form.homeUniversity);

  useEffect(() => {
    async function loadReferenceData() {
      try {
        const [cityResponse, universityResponse, statsResponse] = await Promise.all([
          fetch("/api/cities"),
          fetch("/api/universities"),
          fetch("/api/stats")
        ]);
        const [cityData, universityData, statsData] = await Promise.all([
          cityResponse.json(),
          universityResponse.json(),
          statsResponse.json()
        ]);
        const uniqueCities = [...new Map((cityData.data || []).map((city) => [city.name, city])).values()];
        setCities(uniqueCities);
        setUniversities(universityData.data || []);
        setInstituteCount(statsData.data?.currentInstitutes || null);
      } catch {
        setCities([]);
        setUniversities([]);
        setInstituteCount(null);
      }
    }

    loadReferenceData();
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

  function loadSavedProfile(formData) {
    setForm({ ...defaultForm, ...formData });
    setResults([]);
    setHasPredicted(false);
    setSelectedZone("ALL");
    setCurrentPage(1);
    setTotalPages(0);
    setTotalResults(0);
    setShowValidation(false);
    setMessageType("info");
    setMessage("Profile loaded. Review the details, then press Predict Colleges.");
    setMobileStep(1);
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

  return (
    <>
      <SiteHeader />
      <main className="mx-auto grid min-w-0 max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className="min-w-0 lg:self-stretch">
          <div className="border-l-4 border-action pl-4">
            <p className="text-xs font-semibold uppercase text-action">First-year engineering</p>
            <h1 className="mt-1 text-2xl font-semibold">FE College Predictor</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Find realistic options from verified Maharashtra CAP cutoffs and your official seat eligibility.
            </p>
          </div>
          <div className="mt-4 grid grid-cols-3 divide-x divide-line border-y border-line py-3 text-center">
            <div><strong className="block text-base text-ink">103k+</strong><span className="text-xs text-slate-500">Cutoffs</span></div>
            <div><strong className="block text-base text-ink">3</strong><span className="text-xs text-slate-500">Years</span></div>
            <div><strong className="block text-base text-ink">{instituteCount ?? "--"}</strong><span className="text-xs text-slate-500">Institutes</span></div>
          </div>

          <form ref={predictorFormRef} noValidate onSubmit={submitForm} className="mt-4 grid min-w-0 scroll-mt-20 gap-4 rounded-lg border border-line bg-white p-4">
            <p className="text-right text-xs text-slate-500"><span className="font-semibold text-danger">*</span> Required</p>
            <PredictorProfileBar admissionRoute="FE" formData={form} onLoad={loadSavedProfile} />
            <div className="md:hidden">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-action">Step {mobileStep} of 3</span>
                <span className="text-slate-500">{mobileStep === 1 ? "Score" : mobileStep === 2 ? "Eligibility" : "Preferences"}</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded bg-slate-100">
                <div className="h-full bg-action transition-[width] duration-200" style={{ width: `${(mobileStep / 3) * 100}%` }} />
              </div>
            </div>

            <fieldset data-step="1" className={`${mobileStep === 1 ? "grid" : "hidden"} min-w-0 gap-4 md:grid`}>
              <legend className="sr-only">Score and cutoff history</legend>
              <label className="grid min-w-0 gap-2 text-sm font-medium">
              <span>MHT-CET percentile<RequiredMark /></span>
              <input
                aria-invalid={showValidation && !percentileValid}
                className={`focus-ring min-h-11 w-full min-w-0 max-w-full rounded border px-3 ${showValidation && !percentileValid ? "border-danger" : "border-line"}`}
                inputMode="decimal"
                min="0"
                max="100"
                step="0.01"
                type="number"
                required
                value={form.percentile}
                onChange={(event) => updateField("percentile", event.target.value)}
              />
              {showValidation && !percentileValid ? <span className="text-xs font-normal text-danger">Enter a percentile between 0 and 100.</span> : null}
              </label>

              <label className="grid min-w-0 gap-2 text-sm font-medium">
              Academic year
              <select
                className="focus-ring min-h-11 w-full min-w-0 max-w-full rounded border border-line px-3"
                value={form.academicYear}
                onChange={(event) => updateField("academicYear", event.target.value)}
              >
                <option value="">All available years</option>
                <option value="2025-26">2025-26</option>
                <option value="2024-25">2024-25</option>
                <option value="2023-24">2023-24</option>
              </select>
              </label>

              <label className="grid min-w-0 gap-2 text-sm font-medium">
              CAP round
              <select
                className="focus-ring min-h-11 w-full min-w-0 max-w-full rounded border border-line px-3"
                value={form.capRound}
                onChange={(event) => updateField("capRound", event.target.value)}
              >
                <option value="">Latest available CAP round</option>
                <option value="1">CAP Round 1</option>
                <option value="2">CAP Round 2</option>
                <option value="3">CAP Round 3</option>
                <option value="4">CAP Round 4</option>
              </select>
              </label>
            </fieldset>

            <fieldset data-step="2" className={`${mobileStep === 2 ? "grid" : "hidden"} min-w-0 gap-4 md:grid`}>
              <legend className="sr-only">Admission eligibility</legend>
              <label className="grid min-w-0 gap-2 text-sm font-medium">
              <span>Category<RequiredMark /></span>
              <select
                className="focus-ring min-h-11 w-full min-w-0 max-w-full rounded border border-line px-3"
                value={form.category}
                onChange={(event) => updateField("category", event.target.value)}
              >
                <option value="OPEN">OPEN</option>
                <option value="OBC">OBC</option>
                <option value="SC">SC</option>
                <option value="ST">ST</option>
                <option value="SEBC">SEBC</option>
                <option value="NT1">NT1</option>
                <option value="NT2">NT2</option>
                <option value="NT3">NT3</option>
                <option value="VJ">VJ</option>
              </select>
              </label>

              <label className="grid min-w-0 gap-2 text-sm font-medium">
              <span>Gender<RequiredMark /></span>
              <select
                className="focus-ring min-h-11 w-full min-w-0 max-w-full rounded border border-line px-3"
                value={form.gender}
                onChange={(event) => updateField("gender", event.target.value)}
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </select>
              </label>

              <label className="grid min-w-0 gap-2 text-sm font-medium">
              <span>Home university<RequiredMark /></span>
              <select
                aria-invalid={showValidation && !form.homeUniversity}
                className={`focus-ring min-h-11 w-full min-w-0 max-w-full rounded border px-3 ${showValidation && !form.homeUniversity ? "border-danger" : "border-line"}`}
                required
                value={form.homeUniversity}
                onChange={(event) => updateField("homeUniversity", event.target.value)}
              >
                <option value="">Select your home university</option>
                {universities.map((university) => (
                  <option key={university.id} value={university.name}>{university.name}</option>
                ))}
              </select>
              {showValidation && !form.homeUniversity ? <span className="text-xs font-normal text-danger">Select your home university to continue.</span> : null}
              </label>

              <div className="grid gap-2 text-sm">
                <p className="font-medium">Special eligibility</p>
                <div className="grid grid-cols-2 gap-2">
                {["tfws", "pwd", "defence", "ews"].map((name) => (
                  <label key={name} className="flex min-h-11 items-center gap-2 rounded border border-line px-3">
                    <input
                      type="checkbox"
                      checked={form[name]}
                      onChange={(event) => updateField(name, event.target.checked)}
                    />
                    <span className="min-w-0 text-xs font-medium">{name.toUpperCase()}</span>
                  </label>
                ))}
                </div>
              </div>
            </fieldset>

            <fieldset data-step="3" className={`${mobileStep === 3 ? "grid" : "hidden"} min-w-0 gap-4 md:grid`}>
              <legend className="sr-only">College preferences</legend>
              <CompactMultiSelect
              label="Preferred branches"
              options={branchOptions}
              selectedValues={form.branches}
              emptyText="All branches"
              onToggle={(value) => toggleListValue("branches", value)}
              onClear={() => updateField("branches", [])}
              searchPlaceholder="Type branch name"
              />

              <CompactMultiSelect
              label={`Preferred districts / cities (${cities.length})`}
              options={cities.map((city) => ({ label: city.name, value: city.name }))}
              selectedValues={form.cities}
              emptyText="All Maharashtra"
              onToggle={(value) => toggleListValue("cities", value)}
              onClear={() => updateField("cities", [])}
              searchPlaceholder="Type district or city name"
              noOptionsText="No matching district or city found."
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

              <label className="flex min-h-11 items-center gap-2 rounded border border-line px-3 text-sm font-medium">
              <input
                type="checkbox"
                checked={form.autonomousOnly}
                onChange={(event) => updateField("autonomousOnly", event.target.checked)}
              />
              Autonomous institutes only
              </label>
            </fieldset>

            <div className="grid grid-cols-2 gap-2 md:hidden">
              <button
                className="focus-ring flex min-h-11 items-center justify-center gap-2 rounded border border-line px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
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
              className={`${mobileStep === 3 ? "flex" : "hidden"} focus-ring min-h-11 w-full items-center justify-center gap-2 rounded bg-action px-4 font-semibold text-white disabled:opacity-60 md:flex`}
              disabled={loading || !canPredict}
            >
              <BarChart3 aria-hidden="true" size={18} /> {loading ? "Predicting..." : "Predict Colleges"}
            </button>
            {!canPredict ? <p className="text-center text-xs text-slate-500">Complete the required fields to enable prediction.</p> : null}
          </form>

          {hasPredicted ? (
            <aside className="sticky top-20 mt-4 hidden overflow-hidden rounded-lg border border-line bg-white lg:block">
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

        <section ref={resultsTopRef} className="grid min-w-0 scroll-mt-20 content-start gap-4">
          <div className="overflow-hidden rounded-lg border border-line bg-white">
            <div className={`grid items-start gap-4 p-4 md:p-5 ${hasPredicted ? "md:grid-cols-[minmax(0,1fr)_96px]" : ""}`}>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase text-action">Prediction workspace</p>
                <h2 className="mt-1 text-xl font-semibold">
                  {hasPredicted ? "Your college-branch options" : "Ready for your profile"}
                </h2>
                {hasPredicted ? (
                  <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <dt className="text-xs text-slate-500">Percentile</dt>
                      <dd className="mt-0.5 font-semibold text-ink">{form.percentile}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Category</dt>
                      <dd className="mt-0.5 font-semibold text-ink">{form.category}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-xs text-slate-500">Branch preference</dt>
                      <dd className="mt-0.5 break-words font-semibold text-ink">
                        {selectedSummary(form.branches, branchOptions, "All branches")}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-xs text-slate-500">Location</dt>
                      <dd className="mt-0.5 break-words font-semibold text-ink">
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
            <div className="rounded-lg border border-line bg-white p-8 text-center">
              <BarChart3 aria-hidden="true" className="mx-auto text-action" size={24} />
              <p className="mt-3 font-semibold text-ink">Checking official cutoff records...</p>
              <p className="mt-1 text-sm text-slate-500">This usually takes a few seconds.</p>
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
