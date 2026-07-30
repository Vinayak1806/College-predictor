"use client";

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Database,
  ExternalLink,
  Filter,
  MapPin,
  RefreshCw,
  Search,
  SlidersHorizontal,
  University,
  X
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CollegeAutocomplete } from "../../components/CollegeAutocomplete";
import { SiteHeader } from "../../components/SiteHeader";
import { getPageRange, getPaginationItems } from "../../lib/pagination";
import { explainSeatType } from "../../lib/seatTypes";

const PAGE_SIZE = 20;

const emptyFilters = {
  q: "",
  branch: "",
  city: "",
  year: "",
  round: "",
  route: "",
  category: "",
  seatType: "",
  sort: "NEWEST"
};

const sortOptions = [
  ["NEWEST", "Newest records"],
  ["CUTOFF_HIGH", "Highest cutoff"],
  ["CUTOFF_LOW", "Lowest cutoff"],
  ["COLLEGE", "College name"]
];

function buildQuery(filters, page) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE), sort: filters.sort });
  for (const [key, value] of Object.entries(filters)) {
    if (key !== "sort" && value) params.set(key, value);
  }
  return params;
}

function collegeLink(cutoff) {
  const params = new URLSearchParams({
    branch: cutoff.collegeBranch.branch.displayName,
    year: cutoff.dataset.academicYear,
    round: String(cutoff.dataset.capRound),
    seatType: cutoff.seatType.code,
    cutoff: String(cutoff.closingScore || "")
  });
  return `/colleges/${cutoff.collegeBranch.college.slug}?${params}`;
}

function scoreText(value) {
  if (value === null || value === undefined || value === "") return "-";
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(2) : "-";
}

function rankText(value) {
  if (value === null || value === undefined || value === "") return "-";
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number.toLocaleString("en-IN") : "-";
}

function FilterFields({ filters, options, onChange, onApply, onClear, idPrefix, resetKey }) {
  return (
    <form className="grid gap-4" onSubmit={onApply}>
      <label className="grid gap-1.5 text-sm font-medium text-ink">
        College
        <CollegeAutocomplete
          key={`${idPrefix}-college-${resetKey}`}
          id={`${idPrefix}-college`}
          defaultValue={filters.q}
          selectionMode="fill"
          showIcon={false}
          placeholder="Name or institute code"
          className="focus-within:ring-2 focus-within:ring-[#7db9ca] min-h-11 rounded border border-line px-3"
          onQueryChange={(value) => onChange("q", value)}
          onSelect={(college) => onChange("q", college.name)}
        />
      </label>

      <label className="grid gap-1.5 text-sm font-medium text-ink">
        Branch
        <input
          className="focus-ring min-h-11 min-w-0 rounded border border-line px-3"
          list={`${idPrefix}-branches`}
          placeholder="Type branch name"
          value={filters.branch}
          onChange={(event) => onChange("branch", event.target.value)}
        />
        <datalist id={`${idPrefix}-branches`}>
          {options.branches.map((branch) => <option key={branch} value={branch} />)}
        </datalist>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1.5 text-sm font-medium text-ink">
          Academic year
          <select className="focus-ring min-h-11 rounded border border-line px-3" value={filters.year} onChange={(event) => onChange("year", event.target.value)}>
            <option value="">All years</option>
            {options.years.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-ink">
          CAP round
          <select className="focus-ring min-h-11 rounded border border-line px-3" value={filters.round} onChange={(event) => onChange("round", event.target.value)}>
            <option value="">All rounds</option>
            {options.rounds.map((round) => <option key={round} value={round}>Round {round}</option>)}
          </select>
        </label>
      </div>

      <label className="grid gap-1.5 text-sm font-medium text-ink">
        Admission route
        <select className="focus-ring min-h-11 rounded border border-line px-3" value={filters.route} onChange={(event) => onChange("route", event.target.value)}>
          <option value="">All routes</option>
          {options.routes.map((route) => <option key={route} value={route}>{route}</option>)}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1.5 text-sm font-medium text-ink">
          Category
          <select className="focus-ring min-h-11 rounded border border-line px-3" value={filters.category} onChange={(event) => onChange("category", event.target.value)}>
            <option value="">All categories</option>
            {options.categories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-ink">
          City
          <select className="focus-ring min-h-11 rounded border border-line px-3" value={filters.city} onChange={(event) => onChange("city", event.target.value)}>
            <option value="">All cities</option>
            {options.cities.map((city) => <option key={city} value={city}>{city}</option>)}
          </select>
        </label>
      </div>

      <label className="grid gap-1.5 text-sm font-medium text-ink">
        Exact seat type
        <input
          className="focus-ring min-h-11 rounded border border-line px-3 uppercase"
          list={`${idPrefix}-seat-types`}
          placeholder="Example: GOBCH"
          value={filters.seatType}
          onChange={(event) => onChange("seatType", event.target.value.toUpperCase())}
        />
        <datalist id={`${idPrefix}-seat-types`}>
          {options.seatTypes.map((seatType) => <option key={seatType} value={seatType} />)}
        </datalist>
      </label>

      <label className="grid gap-1.5 text-sm font-medium text-ink">
        Sort results
        <select className="focus-ring min-h-11 rounded border border-line px-3" value={filters.sort} onChange={(event) => onChange("sort", event.target.value)}>
          {sortOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>

      <div className="grid grid-cols-[1fr_auto] gap-2">
        <button className="focus-ring min-h-11 rounded bg-action px-4 text-sm font-semibold text-white" type="submit">
          Apply filters
        </button>
        <button className="focus-ring min-h-11 rounded border border-line bg-white px-4 text-sm font-semibold text-slate-700" type="button" onClick={onClear}>
          Clear
        </button>
      </div>
    </form>
  );
}

function CutoffCard({ cutoff }) {
  const college = cutoff.collegeBranch.college;
  const branch = cutoff.collegeBranch.branch;
  const seatType = explainSeatType(cutoff.seatType.code);

  return (
    <article className="overflow-hidden rounded-lg border border-line bg-white shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line px-4 py-4 md:px-5">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-action">
            Institute {college.instituteCode} · {cutoff.dataset.admissionRoute}
          </p>
          <h2 className="mt-1 text-base font-semibold leading-6 text-ink">
            <Link className="hover:text-action hover:underline" href={collegeLink(cutoff)}>{college.name}</Link>
          </h2>
          <p className="mt-1 text-sm font-semibold text-action">{branch.displayName}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            {college.city?.name ? <span className="inline-flex items-center gap-1.5"><MapPin aria-hidden="true" size={14} />{college.city.name}</span> : null}
            {college.university?.name ? <span className="inline-flex items-center gap-1.5"><University aria-hidden="true" size={14} />{college.university.name}</span> : null}
          </div>
        </div>
        <span className="rounded border border-action bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-action">
          {cutoff.dataset.academicYear} · Round {cutoff.dataset.capRound}
        </span>
      </header>

      <dl className="grid grid-cols-2 border-b border-line bg-panel sm:grid-cols-4">
        <div className="border-b border-r border-line px-4 py-3 sm:border-b-0">
          <dt className="text-xs uppercase text-slate-500">Closing percentile</dt>
          <dd className="mt-1 text-xl font-semibold text-ink">{scoreText(cutoff.closingScore)}</dd>
        </div>
        <div className="border-b border-line px-4 py-3 sm:border-b-0 sm:border-r">
          <dt className="text-xs uppercase text-slate-500">Closing rank</dt>
          <dd className="mt-1 text-xl font-semibold text-ink">{rankText(cutoff.closingRank)}</dd>
        </div>
        <div className="border-r border-line px-4 py-3">
          <dt className="text-xs uppercase text-slate-500">Stage</dt>
          <dd className="mt-1 font-semibold text-ink">{cutoff.stage || "-"}</dd>
        </div>
        <div className="px-4 py-3">
          <dt className="text-xs uppercase text-slate-500">Section</dt>
          <dd className="mt-1 font-semibold text-ink">{cutoff.section || "Standard"}</dd>
        </div>
      </dl>

      <div className="grid gap-3 px-4 py-4 md:grid-cols-[1fr_auto] md:items-center md:px-5">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-slate-500">Official seat type</p>
          <p className="mt-1 font-semibold text-ink">{seatType.code} · {seatType.title}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className="focus-ring inline-flex min-h-11 items-center gap-2 rounded bg-action px-4 text-sm font-semibold text-white" href={collegeLink(cutoff)}>
            College details <ArrowRight aria-hidden="true" size={16} />
          </Link>
          {cutoff.dataset.sourceUrl ? (
            <a className="focus-ring inline-flex min-h-11 items-center gap-2 rounded border border-line px-4 text-sm font-semibold text-slate-700" href={cutoff.dataset.sourceUrl} target="_blank" rel="noreferrer">
              Official source <ExternalLink aria-hidden="true" size={15} />
            </a>
          ) : null}
        </div>
      </div>
      <p className="border-t border-line px-4 py-2 text-xs text-slate-500 md:px-5">
        Source: {cutoff.dataset.sourceFilename} · PDF page {cutoff.sourcePage}
      </p>
    </article>
  );
}

export default function CutoffExplorerPage() {
  const [filters, setFilters] = useState(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);
  const [options, setOptions] = useState({
    years: [],
    routes: [],
    rounds: [],
    categories: [],
    seatTypes: [],
    branches: [],
    cities: []
  });
  const [results, setResults] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [error, setError] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  async function loadResults(nextFilters, nextPage) {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/cutoffs?${buildQuery(nextFilters, nextPage)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Cutoff records could not be loaded.");
      setResults(data.data || []);
      setPage(data.page);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setAppliedFilters(nextFilters);
    } catch (loadError) {
      setError(loadError.message || "Cutoff records could not be loaded.");
      setResults([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    async function initialize() {
      setOptionsLoading(true);
      try {
        const response = await fetch("/api/cutoffs/options", { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Filter options could not be loaded.");
        setOptions(data);
      } catch (loadError) {
        if (loadError.name !== "AbortError") setError(loadError.message);
      } finally {
        if (!controller.signal.aborted) setOptionsLoading(false);
      }
    }
    initialize();
    loadResults(emptyFilters, 1);
    return () => controller.abort();
  }, []);

  const activeFilterCount = useMemo(
    () => Object.entries(appliedFilters).filter(([key, value]) => key !== "sort" && Boolean(value)).length,
    [appliedFilters]
  );
  const pageRange = getPageRange(page, PAGE_SIZE, total);
  const paginationItems = getPaginationItems(page, totalPages);

  function updateFilter(field, value) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  function applyFilters(event) {
    event.preventDefault();
    setDrawerOpen(false);
    loadResults({ ...filters }, 1);
  }

  function clearFilters() {
    setFilters(emptyFilters);
    setResetKey((current) => current + 1);
    setDrawerOpen(false);
    loadResults(emptyFilters, 1);
  }

  function changePage(nextPage) {
    if (nextPage < 1 || nextPage > totalPages || nextPage === page) return;
    loadResults(appliedFilters, nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-7 md:py-10">
        <header className="border-l-4 border-action pl-4">
          <p className="text-xs font-semibold uppercase text-action">Official CAP records</p>
          <h1 className="mt-1 text-3xl font-bold text-ink">Cutoff Explorer</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Find previous closing percentiles and ranks by college, branch, year, round, category and official seat type.
          </p>
        </header>

        <div className="mt-6 flex items-center justify-between gap-3 border-y border-line bg-white px-3 py-3 lg:hidden">
          <div>
            <p className="text-sm font-semibold text-ink">{total.toLocaleString("en-IN")} records found</p>
            <p className="text-xs text-slate-500">{activeFilterCount ? `${activeFilterCount} filters applied` : "All published records"}</p>
          </div>
          <button className="focus-ring inline-flex min-h-11 items-center gap-2 rounded bg-action px-4 text-sm font-semibold text-white" type="button" onClick={() => setDrawerOpen(true)}>
            <SlidersHorizontal aria-hidden="true" size={17} /> Filters
          </button>
        </div>

        <div className="mt-6 grid items-start gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside
            className="sticky top-20 hidden overflow-y-auto rounded-lg border border-line bg-white scrollbar-hidden lg:block"
            style={{ maxHeight: "calc(100vh - 6rem)" }}
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div className="flex items-center gap-2">
                <Filter aria-hidden="true" className="text-action" size={17} />
                <h2 className="font-semibold text-ink">Filter cutoffs</h2>
              </div>
              {optionsLoading ? <RefreshCw aria-hidden="true" className="animate-spin text-slate-400" size={15} /> : null}
            </div>
            <div className="p-4">
              <FilterFields
                filters={filters}
                options={options}
                onChange={updateFilter}
                onApply={applyFilters}
                onClear={clearFilters}
                idPrefix="desktop"
                resetKey={resetKey}
              />
            </div>
          </aside>

          <section className="min-w-0">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
              <div>
                <p className="text-xs font-semibold uppercase text-action">Search results</p>
                <h2 className="mt-1 text-xl font-semibold text-ink">
                  {loading ? "Loading official records..." : `${total.toLocaleString("en-IN")} matching cutoffs`}
                </h2>
              </div>
              {!loading && total ? (
                <p className="text-sm text-slate-500">Showing {pageRange.start}-{pageRange.end}</p>
              ) : null}
            </div>

            {error ? (
              <div className="mt-4 flex items-start gap-3 rounded border border-danger bg-red-50 p-4 text-sm text-danger" role="alert">
                <AlertCircle aria-hidden="true" className="mt-0.5 shrink-0" size={18} />
                <div>
                  <p className="font-semibold">Cutoff Explorer could not load</p>
                  <p className="mt-1">{error}</p>
                  <button className="focus-ring mt-3 min-h-11 rounded border border-danger bg-white px-4 font-semibold" type="button" onClick={() => loadResults(appliedFilters, page)}>
                    Try again
                  </button>
                </div>
              </div>
            ) : null}

            {loading ? (
              <div className="mt-4 grid gap-3">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="h-64 animate-pulse rounded-lg border border-line bg-white" />
                ))}
              </div>
            ) : results.length ? (
              <div className="mt-4 grid gap-3">
                {results.map((cutoff) => <CutoffCard key={cutoff.id} cutoff={cutoff} />)}
              </div>
            ) : !error ? (
              <div className="mt-4 border-y border-line bg-white px-4 py-14 text-center">
                <Search aria-hidden="true" className="mx-auto text-slate-300" size={32} />
                <h2 className="mt-4 font-semibold text-ink">No matching cutoff record</h2>
                <p className="mt-2 text-sm text-slate-600">Remove one or more filters, or check the exact seat-type code.</p>
                <button className="focus-ring mt-4 min-h-11 rounded bg-action px-4 text-sm font-semibold text-white" type="button" onClick={clearFilters}>
                  Clear all filters
                </button>
              </div>
            ) : null}

            {!loading && totalPages > 1 ? (
              <nav className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-white px-3 py-3" aria-label="Cutoff result pages">
                <p className="text-sm text-slate-600">Page {page} of {totalPages}</p>
                <div className="flex items-center gap-1">
                  <button
                    className="focus-ring flex h-11 w-11 items-center justify-center rounded border border-line text-slate-700 disabled:opacity-40"
                    type="button"
                    aria-label="Previous page"
                    disabled={page === 1}
                    onClick={() => changePage(page - 1)}
                  >
                    <ArrowLeft aria-hidden="true" size={17} />
                  </button>
                  {paginationItems.map((item) => (
                    typeof item === "number" ? (
                      <button
                        key={item}
                        className={`focus-ring h-11 min-w-11 rounded border px-2 text-sm font-semibold ${
                          item === page ? "border-action bg-action text-white" : "border-line bg-white text-slate-700"
                        }`}
                        type="button"
                        aria-current={item === page ? "page" : undefined}
                        onClick={() => changePage(item)}
                      >
                        {item}
                      </button>
                    ) : (
                      <span key={item} className="grid h-11 w-8 place-items-center text-slate-400">...</span>
                    )
                  ))}
                  <button
                    className="focus-ring flex h-11 w-11 items-center justify-center rounded border border-line text-slate-700 disabled:opacity-40"
                    type="button"
                    aria-label="Next page"
                    disabled={page === totalPages}
                    onClick={() => changePage(page + 1)}
                  >
                    <ArrowRight aria-hidden="true" size={17} />
                  </button>
                </div>
              </nav>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5"><Database aria-hidden="true" size={14} /> PostgreSQL records, 20 per page</span>
              <span>Always verify final admission rules with Maharashtra CET Cell.</span>
            </div>
          </section>
        </div>
      </main>

      {drawerOpen ? (
        <div className="fixed inset-0 z-[70] bg-slate-950/40 lg:hidden" role="dialog" aria-modal="true" aria-label="Cutoff filters">
          <div className="absolute inset-x-0 bottom-0 max-h-[92vh] overflow-y-auto rounded-t-lg bg-white scrollbar-hidden">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white px-4 py-3">
              <div>
                <p className="text-xs font-semibold uppercase text-action">Cutoff Explorer</p>
                <h2 className="font-semibold text-ink">Filter records</h2>
              </div>
              <button className="focus-ring flex h-11 w-11 items-center justify-center rounded border border-line" type="button" aria-label="Close filters" onClick={() => setDrawerOpen(false)}>
                <X aria-hidden="true" size={19} />
              </button>
            </div>
            <div className="p-4 pb-8">
              <FilterFields
                filters={filters}
                options={options}
                onChange={updateFilter}
                onApply={applyFilters}
                onClear={clearFilters}
                idPrefix="mobile"
                resetKey={resetKey}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
