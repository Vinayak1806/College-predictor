"use client";

import { useState } from "react";
import { ResultCard } from "../../components/ResultCard";
import { SiteHeader } from "../../components/SiteHeader";
import { eligibleSeatTypes } from "../../lib/eligibility";
import { explainSeatType } from "../../lib/seatTypes";

const defaultForm = {
  exam: "MHT_CET",
  percentile: "89.20",
  academicYear: "2025-26",
  capRound: "3",
  category: "OBC",
  exactSeatType: "",
  gender: "MALE",
  universityType: "HOME",
  branch: "Computer",
  city: "Pune",
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
  { label: "All branches", value: "" },
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

export default function FePredictorPage() {
  const [form, setForm] = useState(defaultForm);
  const [results, setResults] = useState([]);
  const [selectedZone, setSelectedZone] = useState("ALL");
  const [seatTypes, setSeatTypes] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const exactSeatOptions = eligibleSeatTypes({
    category: form.category,
    gender: form.gender,
    universityType: form.universityType,
    tfws: form.tfws,
    pwd: form.pwd,
    defence: form.defence,
    ews: form.ews
  });
  const visibleResults = results.filter((result) => {
    const matchesZone = selectedZone === "ALL" || result.zone === selectedZone;

    return matchesZone;
  });

  function updateField(name, value) {
    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
      exactSeatType:
        ["category", "gender", "universityType", "tfws", "pwd", "defence", "ews"].includes(name)
          ? ""
          : currentForm.exactSeatType
    }));
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
      exactSeatType: form.exactSeatType || undefined,
      gender: form.gender,
      universityType: form.universityType,
      preferredBranches: form.branch.trim() ? [form.branch.trim()] : [],
      preferredCities: form.city.trim() ? [form.city.trim()] : [],
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
              University seat type
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

            <label className="grid gap-2 text-sm font-medium">
              Preferred branch
              <select
                className="focus-ring min-h-11 rounded border border-line px-3"
                value={form.branch}
                onChange={(event) => updateField("branch", event.target.value)}
              >
                {branchOptions.map((branch) => (
                  <option key={branch.label} value={branch.value}>
                    {branch.label}
                  </option>
                ))}
              </select>
              <span className="text-xs font-normal text-slate-600">
                Choose All branches if you want wider results.
              </span>
            </label>

            <label className="grid gap-2 text-sm font-medium">
              Preferred city
              <input
                className="focus-ring min-h-11 rounded border border-line px-3"
                value={form.city}
                onChange={(event) => updateField("city", event.target.value)}
              />
            </label>

            <fieldset className="grid gap-2 text-sm">
              <legend className="font-medium">Special eligibility</legend>
              {["tfws", "pwd", "defence", "ews"].map((name) => (
                <label key={name} className="flex min-h-11 items-center gap-2 rounded border border-line px-3">
                  <input
                    type="checkbox"
                    checked={form[name]}
                    onChange={(event) => updateField(name, event.target.checked)}
                  />
                  {name.toUpperCase()}
                </label>
              ))}
            </fieldset>

            <label className="grid gap-2 text-sm font-medium">
              Exact seat type
              <select
                className="focus-ring min-h-11 rounded border border-line px-3"
                value={form.exactSeatType}
                onChange={(event) => updateField("exactSeatType", event.target.value)}
              >
                <option value="">Auto - check all eligible seat types</option>
                {exactSeatOptions.map((seatType) => {
                  const seatTypeInfo = explainSeatType(seatType);

                  return (
                    <option key={seatType} value={seatType}>
                      {seatTypeInfo.label}
                    </option>
                  );
                })}
              </select>
              <span className="text-xs font-normal text-slate-600">
                Final eligible list is calculated after category, gender, university type, and special eligibility.
              </span>
            </label>

            <button
              className="focus-ring sticky bottom-3 min-h-11 rounded bg-action px-4 font-semibold text-white disabled:opacity-60"
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
