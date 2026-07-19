"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ResultCard } from "../../components/ResultCard";
import { SiteHeader } from "../../components/SiteHeader";
import { explainSeatType } from "../../lib/seatTypes";

const defaultForm = {
  exam: "MHT_CET",
  percentile: "89.20",
  academicYear: "2025-26",
  capRound: "3",
  category: "OBC",
  gender: "MALE",
  universityType: "HOME",
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
      className={`focus-ring min-h-11 max-w-full rounded border px-3 py-2 text-left text-sm font-medium ${
        active ? "border-action bg-action text-white" : "border-line bg-white text-slate-700"
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
    <div ref={containerRef} className="relative grid gap-2 text-sm">
      <label className="font-medium" htmlFor={inputId}>{label}</label>
      <div className="focus-within:ring-2 focus-within:ring-[#7db9ca] flex min-h-11 items-center gap-2 rounded border border-line bg-white px-3">
        {!query && selectedValues.length ? (
          <span className="max-w-[48%] shrink-0 truncate rounded bg-panel px-2 py-1 text-xs font-medium text-ink">
            {selectedSummary(selectedValues, options, emptyText)}
          </span>
        ) : null}
        <input
          id={inputId}
          aria-autocomplete="list"
          aria-expanded={open}
          autoComplete="off"
          className="min-h-10 min-w-0 flex-1 border-0 bg-transparent p-0 text-sm outline-none"
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
          <span
            aria-hidden="true"
            className={`h-2 w-2 border-b-2 border-r-2 border-slate-500 transition-transform ${
              open ? "rotate-[225deg]" : "rotate-45"
            }`}
          />
        </button>
      </div>

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
                  <span className="min-w-0 break-words">{option.label}</span>
                  {selected ? <span className="shrink-0 text-xs text-action">Selected</span> : null}
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
  const [form, setForm] = useState(defaultForm);
  const [cities, setCities] = useState([]);
  const [results, setResults] = useState([]);
  const [selectedZone, setSelectedZone] = useState("ALL");
  const [seatTypes, setSeatTypes] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const visibleResults = results.filter((result) => {
    const matchesZone = selectedZone === "ALL" || result.zone === selectedZone;

    return matchesZone;
  });

  useEffect(() => {
    async function loadCities() {
      try {
        const response = await fetch("/api/cities");
        const data = await response.json();
        const uniqueCities = [...new Map((data.data || []).map((city) => [city.name, city])).values()];
        setCities(uniqueCities);
      } catch {
        setCities([]);
      }
    }

    loadCities();
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

  async function submitForm(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setResults([]);
    setSelectedZone("ALL");

    // This object is the student profile that goes to our backend API.
    const studentInput = {
      exam: form.exam,
      percentile: Number(form.percentile),
      academicYear: form.academicYear || undefined,
      capRound: form.capRound ? Number(form.capRound) : undefined,
      category: form.category.trim().toUpperCase(),
      gender: form.gender,
      universityType: form.universityType,
      preferredBranches: form.branches,
      preferredCities: form.cities,
      collegeTypes: form.collegeTypes,
      autonomousOnly: form.autonomousOnly,
      tfws: form.tfws,
      pwd: form.pwd,
      defence: form.defence,
      ews: form.ews
    };

    try {
      const response = await fetch("/api/predict/fe", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(studentInput)
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Prediction failed. Check the form values.");
        return;
      }

      setSeatTypes(data.seatTypes || []);
      setResults(data.results || []);

      if (!data.results?.length) {
        setMessage("No matching colleges found. Try changing branch, city, or category.");
      }
    } catch (error) {
      setMessage("Could not connect to the prediction API. Make sure the website server is running.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[360px_1fr]">
        <section>
          <h1 className="text-2xl font-semibold">FE Predictor</h1>
          <p className="mt-2 text-sm text-slate-600">
            This form sends your details to the backend, searches PostgreSQL cutoffs, and returns matching colleges.
          </p>

          <form onSubmit={submitForm} className="mt-6 grid gap-4 rounded-lg border border-line bg-white p-4">
            <label className="grid gap-2 text-sm font-medium">
              Exam
              <select
                className="focus-ring min-h-11 rounded border border-line px-3"
                value={form.exam}
                onChange={(event) => updateField("exam", event.target.value)}
              >
                <option value="MHT_CET">MHT-CET</option>
                <option value="JEE">JEE</option>
              </select>
            </label>

            <label className="grid gap-2 text-sm font-medium">
              Percentile
              <input
                className="focus-ring min-h-11 rounded border border-line px-3"
                inputMode="decimal"
                min="0"
                max="100"
                step="0.01"
                type="number"
                value={form.percentile}
                onChange={(event) => updateField("percentile", event.target.value)}
              />
            </label>

            <label className="grid gap-2 text-sm font-medium">
              Academic year
              <select
                className="focus-ring min-h-11 rounded border border-line px-3"
                value={form.academicYear}
                onChange={(event) => updateField("academicYear", event.target.value)}
              >
                <option value="">All years</option>
                <option value="2025-26">2025-26</option>
                <option value="2024-25">2024-25</option>
                <option value="2023-24">2023-24</option>
              </select>
            </label>

            <label className="grid gap-2 text-sm font-medium">
              CAP round
              <select
                className="focus-ring min-h-11 rounded border border-line px-3"
                value={form.capRound}
                onChange={(event) => updateField("capRound", event.target.value)}
              >
                <option value="">All rounds</option>
                <option value="1">CAP Round 1</option>
                <option value="2">CAP Round 2</option>
                <option value="3">CAP Round 3</option>
                <option value="4">CAP Round 4</option>
              </select>
            </label>

            <label className="grid gap-2 text-sm font-medium">
              Category
              <select
                className="focus-ring min-h-11 rounded border border-line px-3"
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

            <label className="grid gap-2 text-sm font-medium">
              Gender
              <select
                className="focus-ring min-h-11 rounded border border-line px-3"
                value={form.gender}
                onChange={(event) => updateField("gender", event.target.value)}
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </select>
            </label>

            <label className="grid gap-2 text-sm font-medium">
              University eligibility
              <select
                className="focus-ring min-h-11 rounded border border-line px-3"
                value={form.universityType}
                onChange={(event) => updateField("universityType", event.target.value)}
              >
                <option value="HOME">Home University</option>
                <option value="OTHER">Other Than Home University</option>
                <option value="STATE">State Level</option>
              </select>
            </label>

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
              label={`Preferred cities (${cities.length})`}
              options={cities.map((city) => ({ label: city.name, value: city.name }))}
              selectedValues={form.cities}
              emptyText="All Maharashtra"
              onToggle={(value) => toggleListValue("cities", value)}
              onClear={() => updateField("cities", [])}
              searchPlaceholder="Type city name"
              noOptionsText="No matching city found."
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

            <fieldset className="grid gap-2 text-sm">
              <legend className="font-medium">Special eligibility</legend>
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
            </fieldset>

            <button
              className="focus-ring min-h-11 w-full rounded bg-action px-4 font-semibold text-white disabled:opacity-60"
              disabled={loading}
            >
              {loading ? "Predicting..." : "Predict Colleges"}
            </button>
          </form>
        </section>

        <section className="grid content-start gap-4">
          <div className="rounded-lg border border-line bg-white p-4">
            <h2 className="font-semibold">College predictions</h2>
            <p className="mt-2 text-sm text-slate-600">
              Eligible seats checked:{" "}
              {seatTypes.length ? seatTypes.map((seatType) => explainSeatType(seatType).code).join(", ") : "Run prediction to see seat types."}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Cutoffs searched: {form.academicYear || "All years"}, {form.capRound ? `CAP Round ${form.capRound}` : "all CAP rounds"}.
            </p>
            {seatTypes.length ? (
              <details className="mt-3 rounded border border-line p-3 text-sm">
                <summary className="cursor-pointer font-medium text-action">View eligible seat meanings</summary>
                <div className="mt-3 grid gap-2">
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
            <div className="mt-4 flex flex-wrap gap-2">
              {zoneFilters.map((zone) => (
                <FilterButton
                  key={zone.value}
                  active={selectedZone === zone.value}
                  onClick={() => setSelectedZone(zone.value)}
                >
                  {zone.label}
                </FilterButton>
              ))}
            </div>
            <p className="mt-3 text-sm text-slate-600">
              Showing {visibleResults.length} of {results.length} results.
            </p>
          </div>

          {message ? (
            <div className="rounded-lg border border-warning bg-white p-4 text-sm text-warning">{message}</div>
          ) : null}

          {visibleResults.map((result, index) => (
            <ResultCard key={`${result.college}-${result.branch}-${result.seatType}-${index}`} {...result} />
          ))}
        </section>
      </main>
    </>
  );
}
