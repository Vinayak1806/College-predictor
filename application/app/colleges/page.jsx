import Link from "next/link";
import { ArrowRight, Building2, GraduationCap, MapPin, Search, University } from "lucide-react";
import { CollegeAutocomplete } from "../../components/CollegeAutocomplete";
import { SiteHeader } from "../../components/SiteHeader";
import { currentInstituteCodeSearch } from "../../lib/instituteCodes";
import { prisma } from "../../lib/prisma";
import { latestPublishedDataset } from "../../lib/publishedData";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Explore Maharashtra Engineering Colleges",
  description: "Search current Maharashtra engineering colleges by name, institute code, city or university, then review branches, cutoffs, seats and fees.",
  alternates: { canonical: "/colleges" }
};

function normalizeOwnership(value) {
  if (!value) return null;
  const text = String(value);
  const lower = text.toLowerCase();
  if (lower.includes("government aided") || lower.includes("government-aided")) return "Government-aided";
  if (lower.includes("government")) return "Government";
  if (lower.includes("university")) return "University-managed";
  if (lower.includes("un-aided") || lower.includes("unaided")) return "Un-Aided";
  return text;
}

function isAutonomous(profileValue, collegeValue) {
  const status = String(profileValue || "").trim().toLowerCase();
  const explicitlyNonAutonomous = status.includes("non-autonomous") || status.includes("non autonomous");
  return (!explicitlyNonAutonomous && status.includes("autonomous")) || Boolean(collegeValue);
}

function collegeIdentity(college) {
  const code = String(college.instituteCode || "").replace(/^0+/, "");
  if (code) return `code:${code}`;
  return `name:${college.name.toLowerCase()}|city:${college.city?.name?.toLowerCase() || ""}`;
}

function routeHref(route, search) {
  const params = new URLSearchParams({ route });
  if (search) params.set("q", search);
  return `/colleges?${params.toString()}`;
}

function normalizedInstituteCode(value) {
  return String(value || "").replace(/^0+/, "") || String(value || "");
}

function buildMatrixSummaries(rows) {
  const summaries = new Map();

  for (const row of rows) {
    const code = normalizedInstituteCode(row.instituteCode);
    const current = summaries.get(code) || {
      branches: new Map(),
      years: new Set(),
      latestYear: null,
      latestSeats: 0
    };
    current.branches.set(row.branchCode, row.branchName);
    current.years.add(row.academicYear);

    if (!current.latestYear || row.academicYear > current.latestYear) {
      current.latestYear = row.academicYear;
      current.latestSeats = Number(row.routeSeats || 0);
    } else if (row.academicYear === current.latestYear) {
      current.latestSeats += Number(row.routeSeats || 0);
    }

    summaries.set(code, current);
  }

  return summaries;
}

export default async function CollegesPage({ searchParams }) {
  const query = await searchParams;
  const search = typeof query?.q === "string" ? query.q.trim() : "";
  const admissionRoute = query?.route === "DSE" ? "DSE" : "FE";
  const latestDataset = await latestPublishedDataset(prisma, admissionRoute);
  const currentCodeQuery = currentInstituteCodeSearch(search);
  const routeCutoffFilter = {
    needsReview: false,
    dataset: {
      admissionRoute,
      academicYear: latestDataset?.academicYear,
      status: { in: ["VERIFIED", "PUBLISHED"] },
      predictionEnabled: true
    }
  };
  const routeCollegeFilter = {
    collegeBranches: {
      some: {
        cutoffs: { some: routeCutoffFilter }
      }
    }
  };
  const searchFilter = search
    ? {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { instituteCode: { contains: search, mode: "insensitive" } },
        { city: { name: { contains: search, mode: "insensitive" } } },
        ...(currentCodeQuery ? [{ instituteCode: currentCodeQuery }] : [])
      ]
    }
    : {};

  const [collegeRecords, totalMatchingColleges, matrixRows] = await Promise.all([
    prisma.college.findMany({
      where: {
        ...routeCollegeFilter,
        ...searchFilter
      },
      include: {
        city: true,
        university: true,
        profile: true,
        collegeBranches: {
          where: {
            cutoffs: { some: routeCutoffFilter }
          },
          select: {
            branch: {
              select: {
                branchCode: true,
                displayName: true
              }
            }
          }
        }
      },
      orderBy: [{ name: "asc" }],
      take: 80
    }),
    prisma.college.count({
      where: {
        ...routeCollegeFilter,
        ...searchFilter
      }
    }),
    prisma.seatMatrix.findMany({
      where: {
        admissionRoute,
        needsReview: false
      },
      select: {
        instituteCode: true,
        branchCode: true,
        branchName: true,
        academicYear: true,
        capSeats: true,
        lateralEntrySeats: true
      }
    })
  ]);

  const collegeMap = new Map();
  for (const college of collegeRecords) {
    const key = collegeIdentity(college);
    if (!collegeMap.has(key)) collegeMap.set(key, college);
  }
  const colleges = Array.from(collegeMap.values()).slice(0, 30);
  const matrixSummaries = buildMatrixSummaries(matrixRows.map((row) => ({
    ...row,
    routeSeats: admissionRoute === "DSE"
      ? row.lateralEntrySeats ?? row.capSeats
      : row.capSeats
  })));
  const routeYears = [...new Set(matrixRows.map((row) => row.academicYear))].sort().reverse();
  const routeBranchCount = new Set(
    matrixRows.map((row) => row.branchName.trim().toLowerCase()).filter(Boolean)
  ).size;
  const routeDescription = admissionRoute === "DSE"
    ? "Direct Second-Year (DSE) B.E./B.Tech options based on official diploma-percentage cutoffs and lateral-entry seats."
    : "First-Year Engineering (FE) B.E./B.Tech options based on official CAP cutoffs, branches and approved admission seats.";
  const routeName = admissionRoute === "DSE" ? "Direct Second-Year" : "First-Year";

  return (
    <>
      <SiteHeader />
      <main className="page-shell mx-auto max-w-7xl px-4 py-8 sm:px-5 md:py-12 lg:px-6">
        <header className="max-w-3xl border-l-4 border-action pl-4">
          <p className="text-xs font-semibold uppercase text-action">{routeName} College Research</p>
          <h1 className="mt-2 text-3xl font-bold text-ink md:text-4xl">Explore Maharashtra Engineering Colleges</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">{routeDescription}</p>
        </header>

        <div className="mt-6 grid gap-4 md:grid-cols-[300px_minmax(0,1fr)] md:items-stretch">
          <nav className="grid min-h-11 grid-cols-2 overflow-hidden rounded border border-line bg-white" aria-label="Admission route">
            {["FE", "DSE"].map((route) => (
              <Link
                key={route}
                aria-current={admissionRoute === route ? "page" : undefined}
                className={`focus-ring flex min-h-11 items-center justify-center gap-2 border-r border-line px-4 text-sm font-semibold last:border-r-0 ${
                  admissionRoute === route ? "bg-action text-white" : "text-slate-700 hover:bg-panel"
                }`}
                href={routeHref(route, search)}
              >
                <GraduationCap aria-hidden="true" size={17} />
                {route === "FE" ? "First Year (FE)" : "Direct Second Year (DSE)"}
              </Link>
            ))}
          </nav>

          <dl className="grid grid-cols-3 border-y border-line py-3 text-center">
            <div className="border-r border-line px-2">
              <dt className="text-lg font-semibold text-ink">{totalMatchingColleges}</dt>
              <dd className="mt-1 text-xs text-slate-500">Institutes</dd>
            </div>
            <div className="border-r border-line px-2">
              <dt className="text-lg font-semibold text-ink">{routeBranchCount}</dt>
              <dd className="mt-1 text-xs text-slate-500">Branch types</dd>
            </div>
            <div className="px-2">
              <dt className="text-lg font-semibold text-ink">{routeYears.length}</dt>
              <dd className="mt-1 text-xs text-slate-500">Data years</dd>
            </div>
          </dl>
        </div>

        <form className="surface-card relative z-20 mt-7 flex overflow-visible" action="/colleges">
          <input type="hidden" name="route" value={admissionRoute} />
          <label className="sr-only" htmlFor="college-search">Search colleges</label>
          <CollegeAutocomplete
            id="college-search"
            name="q"
            admissionRoute={admissionRoute}
            defaultValue={search}
            className="flex min-h-12 flex-1 items-center px-4"
            placeholder="Example: COEP, Pune or institute code 16006"
          />
          <button className="focus-ring min-h-12 rounded-r bg-action px-5 text-sm font-semibold text-white hover:bg-[#11566d]" type="submit">Search</button>
        </form>

        <div className="mt-8 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
          <div>
            <h2 className="font-semibold text-ink">{search ? `Results for "${search}"` : "Browse colleges"}</h2>
            <p className="mt-1 text-xs text-slate-500">
              Showing {colleges.length} of {totalMatchingColleges} institutes with official {routeName} records.
            </p>
          </div>
          <span className="rounded bg-panel px-3 py-2 text-sm font-semibold text-slate-700">{routeName} data</span>
        </div>

        {colleges.length ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {colleges.map((college) => {
              const ownership = normalizeOwnership(college.profile?.ownershipType || college.collegeType);
              const autonomous = isAutonomous(college.profile?.autonomyStatus, college.autonomous);
              const matrixSummary = matrixSummaries.get(normalizedInstituteCode(college.instituteCode));
              const routeBranches = [...new Map(
                college.collegeBranches.map(({ branch }) => [branch.branchCode, branch.displayName])
              ).values()];
              const branchNames = routeBranches.slice(0, 3);
              const remainingBranches = Math.max(0, routeBranches.length - branchNames.length);
              const collegeHref = `/colleges/${college.slug}?route=${admissionRoute}`;

              return (
                <article key={college.id.toString()} className="group surface-card p-4 transition hover:border-[#9bcbd6]">
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-cyan-50 text-action"><Building2 aria-hidden="true" size={20} /></span>
                    <span className="text-xs font-semibold text-slate-400">{college.instituteCode}</span>
                  </div>
                  <h3 className="mt-4 text-base font-semibold leading-6 text-ink">
                    <Link className="group-hover:text-action group-hover:underline" href={collegeHref}>{college.name}</Link>
                  </h3>
                  <div className="mt-3 grid gap-1.5 text-xs text-slate-600">
                    {college.city?.name ? <p className="flex items-center gap-2"><MapPin aria-hidden="true" size={14} /> {college.city.name}</p> : null}
                    {college.university?.name ? <p className="flex items-center gap-2"><University aria-hidden="true" size={14} /> {college.university.name}</p> : null}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    {ownership ? <span className="rounded bg-panel px-2 py-1 font-medium text-slate-700">{ownership}</span> : null}
                    {autonomous ? <span className="rounded bg-emerald-50 px-2 py-1 font-medium text-success">Autonomous</span> : null}
                    <span className="rounded bg-panel px-2 py-1 font-medium text-slate-700">{routeBranches.length} {routeName} branches</span>
                  </div>
                  {branchNames.length ? (
                    <p className="mt-4 text-xs leading-5 text-slate-600">
                      <span className="font-semibold text-ink">Available branches:</span> {branchNames.join(", ")}
                      {remainingBranches ? ` and ${remainingBranches} more` : ""}
                    </p>
                  ) : null}
                  {matrixSummary?.latestYear ? (
                    <p className="mt-2 text-xs text-slate-500">
                      {matrixSummary.latestYear} seat matrix
                      {matrixSummary.latestSeats > 0
                        ? ` | ${matrixSummary.latestSeats} ${admissionRoute === "DSE" ? "lateral-entry" : "CAP"} seats`
                        : ""}
                    </p>
                  ) : null}
                  <Link className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-action" href={collegeHref}>View {routeName} details <ArrowRight aria-hidden="true" size={16} /></Link>
                </article>
              );
            })}
          </div>
        ) : (
          <section className="mt-8 border-y border-line py-12 text-center">
            <Search aria-hidden="true" className="mx-auto text-slate-300" size={32} />
            <h2 className="mt-4 font-semibold text-ink">No matching college found</h2>
            <p className="mt-2 text-sm text-slate-600">Try a shorter college name, city or institute code.</p>
          </section>
        )}
      </main>
    </>
  );
}
