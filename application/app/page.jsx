import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  Database,
  FileCheck2,
  GraduationCap,
  Search,
  ShieldCheck,
  SlidersHorizontal
} from "lucide-react";
import { CollegeAutocomplete } from "../components/CollegeAutocomplete";
import { HomeEvidenceCharts } from "../components/HomeEvidenceCharts";
import { SiteHeader } from "../components/SiteHeader";
import { getPublicStats } from "../lib/publicStats";

export const dynamic = "force-dynamic";

export const metadata = {
  alternates: { canonical: "/" },
  openGraph: { url: "/" }
};

const steps = [
  { icon: GraduationCap, title: "Enter your profile", text: "Add your MHT-CET percentile or diploma percentage with admission details." },
  { icon: SlidersHorizontal, title: "Choose preferences", text: "Select branches, cities, ownership and autonomy." },
  { icon: Database, title: "Analyze CAP history", text: "We compare eligible seats across verified years and rounds." },
  { icon: BarChart3, title: "Review clear results", text: "See admission zone, margin, trend, confidence and source." }
];

const features = [
  { icon: ShieldCheck, title: "Eligibility-aware", text: "Seat types are calculated for each college using category, gender and university rules." },
  { icon: BarChart3, title: "Multi-year evidence", text: "Recent years receive more importance while volatility and trend remain visible." },
  { icon: Building2, title: "College research", text: "Open one college page for branches, seats, fees and exact cutoff history." },
  { icon: FileCheck2, title: "Source transparency", text: "Official year, CAP round, seat code and PDF source stay attached to the result." }
];

const questions = [
  ["Does a Safe result guarantee admission?", "No. Safe, Target and Ambitious are historical comparison zones, not guarantees. Actual allotment depends on the current CAP process and available seats."],
  ["Why does the predictor ask for my home university?", "Home and Other Than Home University seat eligibility changes for each college. Selecting the actual university lets the system apply the correct seat codes."],
  ["Is Direct Second-Year (DSE) prediction available?", "Yes. The Direct Second-Year predictor uses published DSE CAP cutoff records. Because fewer historical years are available than for First-Year Engineering, these results show conservative confidence warnings."],
  ["Is the Top Colleges page an official ranking?", "No. It is a transparent historical-demand research signal. It does not claim to measure teaching quality, placements or campus life."]
];

export default async function HomePage() {
  const liveStats = await getPublicStats();
  const verifiedFeCutoffs = liveStats.cutoffCoverage.reduce((sum, row) => sum + row.FE, 0);
  const verifiedDseCutoffs = liveStats.cutoffCoverage.reduce((sum, row) => sum + row.DSE, 0);
  const verifiedCutoffTotal = verifiedFeCutoffs + verifiedDseCutoffs;
  const latestFeYear = liveStats.cutoffCoverage.filter((row) => row.FE > 0).at(-1)?.academicYear || "Not available";
  const latestDseYear = liveStats.cutoffCoverage.filter((row) => row.DSE > 0).at(-1)?.academicYear || "Not available";
  const statistics = [
    [liveStats.currentInstitutes.toLocaleString("en-IN"), "Current CAP institutes"],
    [verifiedCutoffTotal.toLocaleString("en-IN"), "Verified cutoff records"],
    [liveStats.districtsCovered.toLocaleString("en-IN"), "Districts covered"],
    [liveStats.exactSeatTypes.toLocaleString("en-IN"), "Exact seat types"]
  ];
  const admissionRoutes = [
    {
      code: "FE",
      eyebrow: "After Class 12",
      title: "First-Year B.E./B.Tech Admission",
      description: "Use your MHT-CET percentile with category, gender, home university and college preferences.",
      institutes: liveStats.currentFeInstitutes,
      cutoffs: verifiedFeCutoffs,
      latestYear: latestFeYear,
      href: "/fe-predictor",
      action: "Open First-Year Predictor",
      accent: "border-action",
      iconStyle: "bg-cyan-50 text-action"
    },
    {
      code: "DSE",
      eyebrow: "After Diploma",
      title: "Direct Second-Year B.E./B.Tech Admission",
      description: "Use your diploma percentage with category, diploma branch and degree-branch preferences.",
      institutes: liveStats.currentDseInstitutes,
      cutoffs: verifiedDseCutoffs,
      latestYear: latestDseYear,
      href: "/dse-predictor",
      action: "Open Direct Second-Year Predictor",
      accent: "border-success",
      iconStyle: "bg-emerald-50 text-success"
    }
  ];

  return (
    <>
      <SiteHeader />
      <main>
        <section className="relative w-full min-w-0 overflow-hidden bg-[#102a43] text-white">
          <Image
            src="/images/engineering-students-campus.png"
            alt="Engineering students walking through a modern college campus"
            fill
            priority
            sizes="100vw"
            className="h-full w-full max-w-none object-cover object-[62%_center]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#071923]/90 via-[#071923]/72 to-[#071923]/42" />
          <div className="relative mx-auto flex min-h-[min(720px,calc(100svh-68px))] w-full min-w-0 max-w-7xl items-center px-4 py-12 sm:px-5 md:py-16 lg:px-6">
            <div className="enter-up min-w-0 max-w-3xl">
              <div className="inline-flex items-center gap-2 border-l-2 border-amber-400 pl-3 text-sm font-semibold text-white">
                <CheckCircle2 aria-hidden="true" size={17} />
                Structured Maharashtra CAP data
              </div>
              <h1 className="mt-5 max-w-4xl text-4xl font-bold leading-tight md:text-6xl">
                Find Maharashtra engineering colleges that fit your score.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-100 md:text-lg">
                Compare MHT-CET percentile or diploma percentage with eligible seat types, verified CAP cutoffs and current college data.
              </p>

              <div className="mt-7 flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link className="focus-ring inline-flex min-h-12 min-w-0 items-center justify-center gap-2 rounded bg-action px-5 text-center font-semibold leading-5 text-white shadow-lg hover:bg-[#0a596d] hover:shadow-raised sm:flex-1" href="/fe-predictor">
                  First-Year B.E./B.Tech Predictor <ArrowRight aria-hidden="true" size={18} />
                </Link>
                <Link className="focus-ring inline-flex min-h-12 min-w-0 items-center justify-center gap-2 rounded border border-white/70 bg-white/10 px-5 text-center font-semibold leading-5 text-white backdrop-blur-sm hover:border-white hover:bg-white/20 sm:flex-1" href="/dse-predictor">
                  Direct Second-Year (DSE) Predictor <GraduationCap aria-hidden="true" size={18} />
                </Link>
              </div>

              <form action="/colleges" className="relative z-20 mt-8 grid min-w-0 max-w-2xl gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-0 sm:rounded-lg sm:bg-white sm:p-1 sm:shadow-xl">
                <label className="sr-only" htmlFor="home-college-search">Search college name, code or city</label>
                <CollegeAutocomplete id="home-college-search" name="q" className="flex min-h-12 min-w-0 items-center rounded-lg bg-white px-4 text-ink shadow-lg sm:rounded-none sm:shadow-none" placeholder="Search college name or institute code" />
                <button className="focus-ring min-h-12 rounded-lg bg-[#d97706] px-5 text-sm font-semibold text-white shadow-lg hover:bg-[#b85f05] sm:shadow-none" type="submit">Search colleges</button>
              </form>
            </div>
          </div>
        </section>

        <section className="border-y border-line bg-white" aria-label="Verified data coverage">
          <div className="mx-auto grid max-w-7xl gap-3 px-4 py-4 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-center">
            <div className="flex items-center gap-3 border-b border-line pb-3 lg:border-b-0 lg:pb-0">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-cyan-50 text-action">
                <Database aria-hidden="true" size={20} />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase text-action">Live database</p>
                <p className="mt-0.5 text-xs text-slate-500">Published CAP records</p>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-y-3 sm:grid-cols-4 sm:gap-y-0">
              {statistics.map(([value, label], index) => (
                <div key={label} className={`min-w-0 px-3 py-1 sm:border-l sm:border-line ${index % 2 ? "border-l border-line" : ""}`}>
                  <dt className="text-lg font-bold text-ink">{value}</dt>
                  <dd className="mt-0.5 text-xs leading-5 text-slate-500">{label}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-8 md:py-10" aria-labelledby="admission-route-heading">
          <div className="grid gap-3 md:grid-cols-[0.8fr_1.2fr] md:items-center md:gap-8">
            <div>
              <p className="text-xs font-semibold uppercase text-action">Choose your admission route</p>
              <h2 id="admission-route-heading" className="mt-2 text-2xl font-bold text-ink md:text-3xl">Choose your college predictor</h2>
            </div>
            <p className="max-w-3xl text-sm leading-6 text-slate-600">
              First-Year and Direct Second-Year admissions use different cutoff records and eligibility rules. Select the route that matches your current qualification.
            </p>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {admissionRoutes.map((route) => (
              <article key={route.code} className={`surface-card overflow-hidden border-t-4 ${route.accent}`}>
                <div className="grid gap-5 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start md:p-6">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded ${route.iconStyle}`}>
                        <GraduationCap aria-hidden="true" size={22} />
                      </span>
                      <div>
                        <p className="text-xs font-semibold uppercase text-slate-500">{route.eyebrow}</p>
                        <p className="text-xs font-semibold text-action">{route.code} admission</p>
                      </div>
                    </div>
                    <h3 className="mt-4 text-xl font-semibold leading-7 text-ink">{route.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{route.description}</p>
                  </div>
                  <span className="rounded border border-line bg-panel px-3 py-2 text-xs font-semibold text-slate-700">Latest: {route.latestYear}</span>
                </div>

                <dl className="grid grid-cols-2 border-y border-line bg-panel text-center">
                  <div className="border-r border-line px-3 py-4">
                    <dt className="text-lg font-bold text-ink">{route.institutes.toLocaleString("en-IN")}</dt>
                    <dd className="mt-1 text-xs text-slate-500">Current institutes</dd>
                  </div>
                  <div className="px-3 py-4">
                    <dt className="text-lg font-bold text-ink">{route.cutoffs.toLocaleString("en-IN")}</dt>
                    <dd className="mt-1 text-xs text-slate-500">Verified cutoffs</dd>
                  </div>
                </dl>

                <div className="p-4 md:px-6">
                  <Link className="focus-ring inline-flex min-h-11 w-full items-center justify-center gap-2 rounded bg-action px-4 text-sm font-semibold text-white hover:bg-[#0a596d]" href={route.href}>
                    {route.action} <ArrowRight aria-hidden="true" size={17} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500">Counts come from currently published PostgreSQL cutoff datasets and update when an administrator publishes new verified data.</p>
        </section>

        <section className="border-y border-line bg-white">
          <div className="mx-auto max-w-7xl px-4 py-14 md:py-20">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase text-action">How it works</p>
            <h2 className="mt-2 text-3xl font-bold text-ink">From profile to explainable options</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">The predictor keeps admission possibility, college strength and personal preference separate.</p>
          </div>
          <div className="mt-8 grid gap-px overflow-hidden rounded-lg border border-line bg-line shadow-soft md:grid-cols-4">
            {steps.map((step, index) => (
              <article key={step.title} className="group bg-white p-5 transition-[background-color,box-shadow] duration-200 hover:bg-[#fbfdfd] hover:shadow-soft">
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded bg-cyan-50 text-action transition-colors group-hover:bg-action group-hover:text-white"><step.icon aria-hidden="true" size={20} /></span>
                  <span className="text-xs font-semibold text-slate-400">0{index + 1}</span>
                </div>
                <h3 className="mt-5 font-semibold text-ink">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{step.text}</p>
              </article>
            ))}
          </div>
          </div>
        </section>

        <HomeEvidenceCharts coverage={liveStats.cutoffCoverage} />

        <section className="border-y border-line bg-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 md:grid-cols-[0.8fr_1.2fr] md:items-start md:py-20">
            <div>
              <p className="text-xs font-semibold uppercase text-action">Built for decisions</p>
              <h2 className="mt-2 text-3xl font-bold text-ink">Useful evidence, without pretending certainty</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">Every prediction explains the exact historical record used. Missing college information is hidden or clearly marked instead of being invented.</p>
              <Link className="mt-6 inline-flex min-h-11 items-center gap-2 font-semibold text-action" href="/college-index">Explore top Maharashtra engineering colleges <ArrowRight aria-hidden="true" size={17} /></Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {features.map((feature) => (
                <article key={feature.title} className="border-t-2 border-action py-4">
                  <feature.icon aria-hidden="true" className="text-action" size={21} />
                  <h3 className="mt-3 font-semibold text-ink">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{feature.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-14 md:py-20">
          <div className="grid gap-8 md:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-xs font-semibold uppercase text-action">Questions students ask</p>
              <h2 className="mt-2 text-3xl font-bold text-ink">Clear answers before CAP</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">No login is required to use either the First-Year or Direct Second-Year predictor.</p>
            </div>
            <div className="divide-y divide-line border-y border-line">
              {questions.map(([question, answer]) => (
                <details key={question} className="group py-4">
                  <summary className="cursor-pointer list-none pr-6 font-semibold text-ink">{question}</summary>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-line bg-[#eaf5f7]">
          <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div>
              <p className="text-xs font-semibold uppercase text-action">Ready to check your options?</p>
              <h2 className="mt-2 text-2xl font-bold text-ink">Choose First-Year or Direct Second-Year admission.</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Both predictors use their own published cutoff records and eligibility logic.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Link className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded bg-action px-5 text-sm font-semibold text-white shadow-sm hover:bg-[#0a596d] hover:shadow-soft" href="/fe-predictor">First-Year Predictor <ArrowRight aria-hidden="true" size={18} /></Link>
              <Link className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded border border-action bg-white px-5 text-sm font-semibold text-action hover:bg-cyan-50" href="/dse-predictor">Direct Second-Year Predictor <GraduationCap aria-hidden="true" size={18} /></Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
