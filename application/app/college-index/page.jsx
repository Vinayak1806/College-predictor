import Link from "next/link";
import { SiteHeader } from "../../components/SiteHeader";
import { calculateStrengthIndex } from "../../lib/prediction";
import { prisma } from "../../lib/prisma";

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

export const metadata = {
  title: "Maharashtra FE Historical Demand Index"
};

export default async function CollegeIndexPage() {
  const profiles = await prisma.collegeProfile.findMany({
    where: { fePreferenceProxy: { not: null } },
    include: {
      college: {
        include: { city: true, university: true }
      }
    }
  });

  const colleges = profiles
    .map((profile) => {
      const autonomous = profile.autonomyStatus?.toLowerCase().includes("autonomous") || profile.college.autonomous;
      const historicalDemandScore = Number(profile.fePreferenceProxy);
      const demandIndex = calculateStrengthIndex({
        historicalDemandScore,
        autonomous,
        sanctionedIntake: profile.totalIntake,
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
        totalIntake: profile.totalIntake,
        demandBand: profile.preferenceBand,
        historicalDemandScore,
        demandIndex
      };
    })
    .sort((a, b) => b.demandIndex - a.demandIndex || b.historicalDemandScore - a.historicalDemandScore)
    .slice(0, 50);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <header className="max-w-4xl border-l-4 border-action pl-4">
          <p className="text-xs font-semibold uppercase text-action">Research tool</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink md:text-3xl">Maharashtra FE Historical Demand Index</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            This derived list highlights colleges that have shown stronger student demand in previous FE cutoffs. It is not an official government ranking and does not measure placements, teaching quality or campus life.
          </p>
        </header>

        <section className="mt-6 grid gap-px overflow-hidden rounded border border-line bg-line sm:grid-cols-4">
          <div className="bg-white p-4"><p className="text-xs uppercase text-slate-500">Colleges shown</p><p className="mt-1 text-xl font-semibold">{colleges.length}</p></div>
          <div className="bg-white p-4"><p className="text-xs uppercase text-slate-500">Cutoff contribution</p><p className="mt-1 text-xl font-semibold">90%</p></div>
          <div className="bg-white p-4"><p className="text-xs uppercase text-slate-500">Other signals</p><p className="mt-1 text-sm font-semibold">Autonomy, intake, coverage</p></div>
          <div className="bg-white p-4"><p className="text-xs uppercase text-slate-500">Data type</p><p className="mt-1 text-sm font-semibold">Calculated, not official</p></div>
        </section>

        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-ink">Top historical-demand colleges</h2>
              <p className="mt-1 text-sm text-slate-600">Open a college to inspect its branches, seats and exact cutoff history.</p>
            </div>
            <Link className="font-medium text-action underline" href="/fe-predictor">Check your admission fit</Link>
          </div>

          <div className="mt-4 hidden overflow-hidden rounded border border-line bg-white md:block">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-panel text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Position</th>
                  <th className="px-4 py-3">College</th>
                  <th className="px-4 py-3">Demand index</th>
                  <th className="px-4 py-3">Profile</th>
                  <th className="px-4 py-3">Intake</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {colleges.map((college, index) => (
                  <tr key={college.instituteCode}>
                    <td className="px-4 py-4 text-lg font-semibold text-action">#{index + 1}</td>
                    <td className="px-4 py-4">
                      <Link className="font-semibold text-ink hover:text-action hover:underline" href={`/colleges/${college.slug}`}>{college.name}</Link>
                      <p className="mt-1 text-xs text-slate-500">{[college.city, college.university].filter(Boolean).join(" | ")}</p>
                    </td>
                    <td className="px-4 py-4"><strong className="text-base">{college.demandIndex}</strong><span className="text-slate-500"> / 100</span></td>
                    <td className="px-4 py-4 text-slate-600">{[college.ownership, college.autonomous ? "Autonomous" : null].filter(Boolean).join(" | ")}</td>
                    <td className="px-4 py-4">{college.totalIntake ?? "Not available"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid gap-3 md:hidden">
            {colleges.map((college, index) => (
              <article key={college.instituteCode} className="rounded border border-line bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-lg font-semibold text-action">#{index + 1}</span>
                  <span className="rounded bg-panel px-3 py-1 text-sm font-semibold">{college.demandIndex} / 100</span>
                </div>
                <Link className="mt-3 block font-semibold leading-6 text-ink hover:text-action hover:underline" href={`/colleges/${college.slug}`}>{college.name}</Link>
                <p className="mt-1 text-sm text-slate-500">{college.city || "Maharashtra"}</p>
                <p className="mt-3 text-xs leading-5 text-slate-600">{[college.ownership, college.autonomous ? "Autonomous" : null, college.totalIntake ? `Intake ${college.totalIntake}` : null].filter(Boolean).join(" | ")}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 border-t border-line pt-5 text-sm leading-6 text-slate-600">
          <h2 className="font-semibold text-ink">How to use this index</h2>
          <p className="mt-2">Use it as a research starting point, then check the exact branch, your eligible seat type, fees, location and historical admission fit. A high-demand college is not automatically the best personal choice for every student.</p>
        </section>
      </main>
    </>
  );
}
