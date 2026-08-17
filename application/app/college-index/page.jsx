import Link from "next/link";
import { BadgeInfo, Building2, Gauge, Percent } from "lucide-react";
import { CompactMetricGrid } from "../../components/CompactMetricGrid";
import { SiteHeader } from "../../components/SiteHeader";
import { calculateStrengthIndex } from "../../lib/prediction";
import { prisma } from "../../lib/prisma";
import { activeCollegeWhere, latestPublishedDataset } from "../../lib/publishedData";
import { absoluteUrl } from "../../lib/site";

function hasValue(value) {
  return value !== null && value !== undefined && value !== "";
}

function normalizeOwnership(value) {
  if (!hasValue(value)) return null;

  const text = String(value);
  const lower = text.toLowerCase();
  if (lower.includes("government aided") || lower.includes("government-aided")) return "Government-aided";
  if (lower.includes("government")) return "Government";
  if (lower.includes("university")) return "University-managed";
  if (lower.includes("un-aided") || lower.includes("unaided")) return "Un-Aided";
  return text;
}

export async function generateMetadata({ searchParams }) {
  const query = await searchParams;
  const admissionRoute = query?.route === "DSE" ? "DSE" : "FE";
  const dse = admissionRoute === "DSE";
  const title = dse
    ? "Top Direct Second-Year (DSE) Engineering Colleges in Maharashtra"
    : "Top Engineering Colleges in Maharashtra by CAP Cutoff Demand";
  const description = dse
    ? "Explore top Direct Second-Year (DSE) engineering colleges in Maharashtra ordered by historical CAP cutoff demand, with seats, location and college details."
    : "Explore top engineering colleges in Maharashtra ordered by historical First-Year Engineering CAP cutoff demand, with intake, autonomy, location and detailed cutoff records.";
  const canonical = dse ? "/college-index?route=DSE" : "/college-index";

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical }
  };
}

function profileIsAutonomous(value) {
  const text = String(value || "").toLowerCase();
  return text.includes("autonomous") && !text.includes("non-autonomous");
}

export default async function CollegeIndexPage({ searchParams }) {
  const query = await searchParams;
  const admissionRoute = query?.route === "DSE" ? "DSE" : "FE";
  const requestedPage = Math.max(1, Number.parseInt(query?.page || "1", 10) || 1);
  const pageSize = 50;
  const preferenceField = admissionRoute === "DSE" ? "dsePreferenceProxy" : "fePreferenceProxy";
  const predictorHref = admissionRoute === "DSE" ? "/dse-predictor" : "/fe-predictor";
  const latestDataset = await latestPublishedDataset(prisma, admissionRoute);
  const [profiles, dseSeatTotals, latestOpenCutoffs] = await Promise.all([
    prisma.collegeProfile.findMany({
      where: {
        currentCap2025: "Yes",
        [preferenceField]: { not: null },
        college: {
          is: activeCollegeWhere(admissionRoute, latestDataset?.academicYear)
        }
      },
      include: {
        college: {
          include: { city: true, university: true }
        }
      }
    }),
    admissionRoute === "DSE" && latestDataset
      ? prisma.seatMatrix.groupBy({
          by: ["instituteCode"],
          where: {
            academicYear: latestDataset.academicYear,
            admissionRoute: "DSE",
            needsReview: false
          },
          _sum: { lateralEntrySeats: true }
        })
      : Promise.resolve([]),
    latestDataset
      ? prisma.cutoff.findMany({
          where: {
            datasetId: latestDataset.id,
            needsReview: false,
            closingScore: { not: null },
            seatType: {
              OR: [
                { code: { startsWith: "GOPEN" } },
                { code: { startsWith: "LOPEN" } }
              ]
            }
          },
          select: {
            closingScore: true,
            collegeBranch: {
              select: {
                branchId: true,
                college: {
                  select: {
                    instituteCode: true,
                    name: true,
                    slug: true,
                    collegeType: true,
                    autonomous: true,
                    city: { select: { name: true } },
                    university: { select: { name: true } }
                  }
                }
              }
            }
          }
        })
      : Promise.resolve([])
  ]);
  const dseSeatsByCollege = new Map(
    dseSeatTotals.map((row) => [row.instituteCode, row._sum.lateralEntrySeats])
  );

  const profiledColleges = profiles
    .map((profile) => {
      const autonomous = profileIsAutonomous(profile.autonomyStatus) || profile.college.autonomous;
      const historicalDemandScore = Number(profile[preferenceField]);
      const routeCapacity = admissionRoute === "DSE"
        ? dseSeatsByCollege.get(profile.instituteCode) ?? null
        : profile.totalIntake;
      const demandIndex = calculateStrengthIndex({
        historicalDemandScore,
        autonomous,
        sanctionedIntake: routeCapacity,
        dataConfidence: "MEDIUM"
      });

      return {
        slug: profile.college.slug,
        instituteCode: profile.college.instituteCode,
        name: profile.college.name,
        city: profile.college.city?.name || profile.districtCity,
        university: profile.college.university?.name || profile.university,
        ownership: normalizeOwnership(profile.ownershipType || profile.college.collegeType),
        autonomous,
        routeCapacity,
        demandBand: profile.preferenceBand,
        historicalDemandScore,
        demandIndex
      };
    });
  const profiledCodes = new Set(profiledColleges.map((college) => college.instituteCode));
  const fallbackByCollege = new Map();
  for (const cutoff of latestOpenCutoffs) {
    const college = cutoff.collegeBranch.college;
    if (profiledCodes.has(college.instituteCode)) continue;
    const current = fallbackByCollege.get(college.instituteCode) || {
      college,
      branchScores: new Map()
    };
    const score = Number(cutoff.closingScore);
    const previous = current.branchScores.get(cutoff.collegeBranch.branchId) ?? -1;
    if (score > previous) current.branchScores.set(cutoff.collegeBranch.branchId, score);
    fallbackByCollege.set(college.instituteCode, current);
  }
  const fallbackColleges = [...fallbackByCollege.values()].map(({ college, branchScores }) => {
    const strongestBranches = [...branchScores.values()].sort((a, b) => b - a).slice(0, 3);
    const historicalDemandScore = strongestBranches.reduce((sum, score) => sum + score, 0) / strongestBranches.length;
    const routeCapacity = admissionRoute === "DSE"
      ? dseSeatsByCollege.get(college.instituteCode) ?? null
      : null;
    return {
      slug: college.slug,
      instituteCode: college.instituteCode,
      name: college.name,
      city: college.city?.name || null,
      university: college.university?.name || null,
      ownership: normalizeOwnership(college.collegeType),
      autonomous: college.autonomous,
      routeCapacity,
      demandBand: "Latest published year",
      historicalDemandScore,
      demandIndex: calculateStrengthIndex({
        historicalDemandScore,
        autonomous: college.autonomous,
        sanctionedIntake: routeCapacity,
        dataConfidence: "LIMITED"
      })
    };
  });

  const rankedColleges = [...profiledColleges, ...fallbackColleges]
    .sort((a, b) => b.demandIndex - a.demandIndex || b.historicalDemandScore - a.historicalDemandScore);
  const totalPages = Math.max(1, Math.ceil(rankedColleges.length / pageSize));
  const currentPage = Math.min(requestedPage, totalPages);
  const firstPosition = (currentPage - 1) * pageSize;
  const colleges = rankedColleges.slice(firstPosition, firstPosition + pageSize);
  const pageTitle = admissionRoute === "DSE"
    ? "Top Direct Second-Year (DSE) Engineering Colleges in Maharashtra"
    : "Top Engineering Colleges in Maharashtra";
  const routeName = admissionRoute === "DSE" ? "Direct Second-Year (DSE)" : "First-Year Engineering (FE)";
  const canonicalUrl = absoluteUrl(admissionRoute === "DSE" ? "/college-index?route=DSE" : "/college-index");
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${pageTitle} by historical CAP cutoff demand`,
    description: `A research list of Maharashtra ${routeName} colleges ordered by historical CAP cutoff demand. This is not an official government ranking.`,
    url: canonicalUrl,
    numberOfItems: rankedColleges.length,
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    itemListElement: colleges.map((college, index) => ({
      "@type": "ListItem",
      position: firstPosition + index + 1,
      item: {
        "@type": "CollegeOrUniversity",
        name: college.name,
        url: absoluteUrl(`/colleges/${college.slug}?route=${admissionRoute}`),
        address: college.city ? { "@type": "PostalAddress", addressLocality: college.city, addressRegion: "Maharashtra", addressCountry: "IN" } : undefined
      }
    }))
  };

  return (
    <>
      <SiteHeader />
      <main className="page-shell mx-auto max-w-7xl px-4 py-8 sm:px-5 lg:px-6">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd).replace(/</g, "\\u003c") }}
        />
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <header className="max-w-3xl border-l-4 border-indigo-600 pl-4">
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Historical CAP demand index</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">{pageTitle}</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Compare Maharashtra colleges that have shown stronger student demand in previous {routeName} CAP cutoffs. First-Year and Direct Second-Year records are calculated separately. This is a historical cutoff research index, not an official government ranking, and it does not measure placements, teaching quality or campus life.
            </p>
          </header>

          <nav className="flex min-h-14 shrink-0 items-center gap-2.5 rounded-2xl bg-white p-2 border border-slate-200/90 shadow-sm" aria-label="Historical demand admission route">
            {["FE", "DSE"].map((route) => (
              <Link
                key={route}
                aria-current={admissionRoute === route ? "page" : undefined}
                className={`focus-ring flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 text-sm sm:text-base font-bold transition-all ${
                  admissionRoute === route ? "bg-indigo-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
                href={`/college-index?route=${route}`}
              >
                {route === "FE" ? "First-Year Colleges" : "Direct Second-Year Colleges"}
              </Link>
            ))}
          </nav>
        </div>

        <CompactMetricGrid
          className="mt-6 grid-cols-2 lg:grid-cols-4"
          items={[
            { label: "Colleges indexed", value: rankedColleges.length, icon: Building2, tone: "action" },
            { label: "Cutoff contribution", value: "90%", icon: Percent, tone: "indigo" },
            { label: "Additional signals", value: admissionRoute === "DSE" ? "DSE seats" : "Intake", note: "Autonomy and coverage", icon: Gauge, tone: "success" },
            { label: "Index type", value: "Calculated", note: "Not an official ranking", icon: BadgeInfo, tone: "warning" }
          ]}
        />

        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-ink">Maharashtra colleges with the highest historical cutoff demand</h2>
              <p className="mt-1 text-sm text-slate-600">Open a college to inspect its branches, seats and exact cutoff history.</p>
            </div>
            <Link className="font-medium text-action underline" href={predictorHref}>Check your {routeName} admission fit</Link>
          </div>

          <div className="mt-4 hidden overflow-hidden rounded-xl border border-line bg-white shadow-soft md:block">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-panel/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Position</th>
                  <th className="px-4 py-3">College</th>
                  <th className="px-4 py-3">Demand index</th>
                  <th className="px-4 py-3">Profile</th>
                  <th className="px-4 py-3">{admissionRoute === "DSE" ? "Direct Second-Year seats" : "First-Year intake"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {colleges.map((college, index) => (
                  <tr key={college.instituteCode} className="transition-colors hover:bg-cyan-50/40">
                    <td className="px-4 py-4 text-lg font-semibold text-action">#{firstPosition + index + 1}</td>
                    <td className="px-4 py-4">
                      <Link className="font-semibold text-ink hover:text-action hover:underline" href={`/colleges/${college.slug}?route=${admissionRoute}`}>{college.name}</Link>
                      <p className="mt-1 text-xs text-slate-500">{[college.city, college.university].filter(Boolean).join(" | ")}</p>
                    </td>
                    <td className="px-4 py-4"><strong className="text-base">{college.demandIndex}</strong><span className="text-slate-500"> / 100</span></td>
                    <td className="px-4 py-4 text-slate-600">{[college.ownership, college.autonomous ? "Autonomous" : null].filter(Boolean).join(" | ")}</td>
                    <td className="px-4 py-4">{college.routeCapacity ?? "Not available"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid gap-3 md:hidden">
            {colleges.map((college, index) => (
              <article key={college.instituteCode} className="surface-card rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-lg font-bold text-action">#{firstPosition + index + 1}</span>
                  <span className="tag tag-action">{college.demandIndex} / 100</span>
                </div>
                <Link className="mt-3 block font-semibold leading-6 text-ink hover:text-action hover:underline" href={`/colleges/${college.slug}?route=${admissionRoute}`}>{college.name}</Link>
                <p className="mt-1 text-sm text-slate-500">{college.city || "Maharashtra"}</p>
                <p className="mt-3 text-xs leading-5 text-slate-600">{[college.ownership, college.autonomous ? "Autonomous" : null, college.routeCapacity ? `${admissionRoute === "DSE" ? "DSE seats" : "Intake"} ${college.routeCapacity}` : null].filter(Boolean).join(" | ")}</p>
              </article>
            ))}
          </div>

          {totalPages > 1 ? (
            <nav className="mt-5 flex items-center justify-between gap-3 rounded border border-line bg-white p-3" aria-label="College index pages">
              {currentPage > 1 ? (
                <Link className="focus-ring flex min-h-11 items-center rounded border border-line px-4 text-sm font-semibold text-action" href={`/college-index?route=${admissionRoute}&page=${currentPage - 1}`}>Previous</Link>
              ) : <span className="min-h-11 px-4" />}
              <p className="text-sm text-slate-600">Page <strong className="text-ink">{currentPage}</strong> of {totalPages}</p>
              {currentPage < totalPages ? (
                <Link className="focus-ring flex min-h-11 items-center rounded border border-line px-4 text-sm font-semibold text-action" href={`/college-index?route=${admissionRoute}&page=${currentPage + 1}`}>Next</Link>
              ) : <span className="min-h-11 px-4" />}
            </nav>
          ) : null}
        </section>

        <section className="mt-8 border-t border-line pt-5 text-sm leading-6 text-slate-600">
          <h2 className="font-semibold text-ink">How to use this index</h2>
          <p className="mt-2">Use it as a research starting point, then check the exact branch, your eligible seat type, fees, location and historical admission fit. A high-demand college is not automatically the best personal choice for every student.</p>
        </section>
      </main>
    </>
  );
}
