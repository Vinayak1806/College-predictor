import Link from "next/link";
import { ArrowRight, Building2, MapPin, Search, University } from "lucide-react";
import { CollegeAutocomplete } from "../../components/CollegeAutocomplete";
import { SiteHeader } from "../../components/SiteHeader";
import { currentInstituteCodeSearch } from "../../lib/instituteCodes";
import { prisma } from "../../lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Explore Maharashtra Engineering Colleges"
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

function collegeIdentity(college) {
  const code = String(college.instituteCode || "").replace(/^0+/, "");
  if (code) return `code:${code}`;
  return `name:${college.name.toLowerCase()}|city:${college.city?.name?.toLowerCase() || ""}`;
}

function collegeDataScore(college) {
  return (college.profile ? 10 : 0) + college._count.collegeBranches;
}

export default async function CollegesPage({ searchParams }) {
  const query = await searchParams;
  const search = typeof query?.q === "string" ? query.q.trim() : "";
  const currentCodeQuery = currentInstituteCodeSearch(search);

  const collegeRecords = await prisma.college.findMany({
    where: {
      profile: { is: { currentCap2025: "Yes" } },
      ...(search
        ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { instituteCode: { contains: search, mode: "insensitive" } },
            { city: { name: { contains: search, mode: "insensitive" } } },
            ...(currentCodeQuery ? [{ instituteCode: currentCodeQuery }] : [])
          ]
        }
        : {})
    },
    include: {
      city: true,
      university: true,
      profile: true,
      _count: { select: { collegeBranches: true } }
    },
    orderBy: [{ name: "asc" }],
    take: 80
  });

  const collegeMap = new Map();
  for (const college of collegeRecords) {
    const key = collegeIdentity(college);
    const current = collegeMap.get(key);
    if (!current || collegeDataScore(college) > collegeDataScore(current)) {
      collegeMap.set(key, college);
    }
  }
  const colleges = Array.from(collegeMap.values()).slice(0, 30);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-8 md:py-12">
        <header className="max-w-3xl">
          <p className="text-xs font-semibold uppercase text-action">College research</p>
          <h1 className="mt-2 text-3xl font-bold text-ink md:text-4xl">Explore Maharashtra engineering colleges</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">Search by college name, institute code or city, then open one profile for branches, seats and official cutoff history.</p>
        </header>

        <form className="relative z-20 mt-7 flex max-w-3xl rounded border border-line bg-white shadow-sm" action="/colleges">
          <label className="sr-only" htmlFor="college-search">Search colleges</label>
          <CollegeAutocomplete id="college-search" name="q" defaultValue={search} className="flex min-h-12 flex-1 items-center px-4" placeholder="Example: COEP, Pune or institute code 16006" />
          <button className="focus-ring min-h-12 rounded-r bg-action px-5 text-sm font-semibold text-white hover:bg-[#11566d]" type="submit">Search</button>
        </form>

        <div className="mt-8 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
          <div>
            <h2 className="font-semibold text-ink">{search ? `Results for "${search}"` : "Browse colleges"}</h2>
            <p className="mt-1 text-xs text-slate-500">Showing up to 30 structured college records.</p>
          </div>
          <span className="rounded bg-panel px-3 py-2 text-sm font-semibold text-slate-700">{colleges.length} found</span>
        </div>

        {colleges.length ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {colleges.map((college) => {
              const ownership = normalizeOwnership(college.profile?.ownershipType || college.collegeType);
              const autonomous = college.profile?.autonomyStatus?.toLowerCase().includes("autonomous") || college.autonomous;

              return (
                <article key={college.id.toString()} className="group rounded border border-line bg-white p-4 shadow-sm transition hover:border-[#9bcbd6] hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-cyan-50 text-action"><Building2 aria-hidden="true" size={20} /></span>
                    <span className="text-xs font-semibold text-slate-400">{college.instituteCode}</span>
                  </div>
                  <h3 className="mt-4 text-base font-semibold leading-6 text-ink">
                    <Link className="group-hover:text-action group-hover:underline" href={`/colleges/${college.slug}`}>{college.name}</Link>
                  </h3>
                  <div className="mt-3 grid gap-1.5 text-xs text-slate-600">
                    {college.city?.name ? <p className="flex items-center gap-2"><MapPin aria-hidden="true" size={14} /> {college.city.name}</p> : null}
                    {college.university?.name ? <p className="flex items-center gap-2"><University aria-hidden="true" size={14} /> {college.university.name}</p> : null}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    {ownership ? <span className="rounded bg-panel px-2 py-1 font-medium text-slate-700">{ownership}</span> : null}
                    {autonomous ? <span className="rounded bg-emerald-50 px-2 py-1 font-medium text-success">Autonomous</span> : null}
                    <span className="rounded bg-panel px-2 py-1 font-medium text-slate-700">{college._count.collegeBranches} branch records</span>
                  </div>
                  <Link className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-action" href={`/colleges/${college.slug}`}>View college details <ArrowRight aria-hidden="true" size={16} /></Link>
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
