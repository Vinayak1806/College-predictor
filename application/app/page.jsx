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
  MapPinned,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Tags
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
  { icon: GraduationCap, iconStyle: "bg-indigo-50 text-indigo-600", title: "Enter your profile", text: "Add your MHT-CET percentile or diploma percentage with admission details." },
  { icon: SlidersHorizontal, iconStyle: "bg-cyan-50 text-action", title: "Choose preferences", text: "Select branches, cities, ownership and autonomy." },
  { icon: Database, iconStyle: "bg-emerald-50 text-emerald-700", title: "Analyze CAP history", text: "We compare eligible seats across verified years and rounds." },
  { icon: BarChart3, iconStyle: "bg-amber-50 text-amber-700", title: "Review clear results", text: "See admission zone, margin, trend, confidence and source." }
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
    {
      value: liveStats.currentInstitutes.toLocaleString("en-IN"),
      label: "Current CAP institutes",
      icon: Building2,
      iconStyle: "bg-indigo-50 text-indigo-600"
    },
    {
      value: verifiedCutoffTotal.toLocaleString("en-IN"),
      label: "Verified cutoff records",
      icon: FileCheck2,
      iconStyle: "bg-emerald-50 text-emerald-700"
    },
    {
      value: liveStats.districtsCovered.toLocaleString("en-IN"),
      label: "Districts covered",
      icon: MapPinned,
      iconStyle: "bg-cyan-50 text-action"
    },
    {
      value: liveStats.exactSeatTypes.toLocaleString("en-IN"),
      label: "Exact seat types",
      icon: Tags,
      iconStyle: "bg-amber-50 text-amber-700"
    }
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
      accent: "border-indigo-600",
      cardHoverStyle: "hover:border-indigo-500",
      badgeStyle: "bg-indigo-50 text-indigo-700 border-indigo-100",
      iconStyle: "bg-indigo-600 text-white",
      codeStyle: "text-indigo-600",
      actionStyle: "btn-primary shadow-md"
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
      accent: "border-emerald-600",
      cardHoverStyle: "hover:border-emerald-500",
      badgeStyle: "bg-emerald-50 text-emerald-700 border-emerald-100",
      iconStyle: "bg-emerald-600 text-white",
      codeStyle: "text-emerald-700",
      actionStyle: "bg-emerald-600 text-white shadow-md hover:bg-emerald-700"
    }
  ];

  return (
    <>
      <SiteHeader />
      <main className="home-page bg-white">
        {/* Hero Section */}
        <section className="home-hero relative w-full min-w-0 overflow-hidden bg-[#0f172a] text-white">
          <Image
            src="/images/engineering-students-campus.png"
            alt="Engineering students walking through a modern college campus"
            fill
            priority
            sizes="100vw"
            className="h-full w-full max-w-none object-cover object-[70%_center] brightness-[0.95] contrast-[1.05]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/50 to-slate-950/20" />
          <div className="relative mx-auto flex min-h-[min(680px,calc(100svh-64px))] w-full min-w-0 max-w-7xl items-center px-4 py-14 sm:px-5 md:py-18 lg:px-6">
            <div className="enter-up min-w-0 max-w-3xl">
              <div className="inline-flex items-center gap-2.5 rounded-full border border-indigo-400/50 bg-indigo-600/90 px-4 py-1.5 text-xs font-bold text-white shadow-md backdrop-blur-md">
                <Sparkles aria-hidden="true" className="text-amber-300 fill-amber-300" size={15} />
                <span>Structured Maharashtra CAP Data</span>
              </div>
              <h1 className="mt-5 max-w-4xl text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl lg:text-6xl leading-[1.12]">
                Find Maharashtra Engineering Colleges That Fit Your Score.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-100 sm:text-lg">
                Compare MHT-CET percentile or diploma percentage with eligible seat types, verified CAP cutoffs and current college data.
              </p>

              <div className="mt-8 flex min-w-0 max-w-2xl flex-col gap-3.5 sm:flex-row">
                <Link className="btn-primary focus-ring min-w-0 rounded-xl px-5 py-3 text-center text-sm font-bold leading-5 shadow-xl sm:flex-1 justify-center" href="/fe-predictor">
                  First-Year B.E./B.Tech Predictor <ArrowRight aria-hidden="true" size={18} />
                </Link>
                <Link className="focus-ring inline-flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-xl border border-gray-400/40 bg-gradient-to-r from-gray-500 to-gray-600 px-5 py-3 text-center text-sm font-bold leading-5 text-white shadow-xl transition-all hover:from-gray-600 hover:to-gray-400 active:scale-[0.98] sm:flex-1" href="/dse-predictor">
                  Direct Second-Year (DSE) Predictor <GraduationCap aria-hidden="true" size={18} />
                </Link>
              </div>

              <form action="/colleges" className="relative z-20 mt-4 grid min-w-0 max-w-2xl gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                <label className="sr-only" htmlFor="home-college-search">Search college name, code or city</label>
                <CollegeAutocomplete
                  id="home-college-search"
                  name="q"
                  className="flex min-h-12 min-w-0 items-center rounded-xl border border-slate-200/90 bg-white px-4 text-slate-900 shadow-xl transition-all focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20"
                  placeholder="Search college name or institute code"
                />
                <button className="focus-ring flex min-h-12 items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-7 text-sm font-bold text-slate-950 shadow-xl transition-all hover:from-amber-400 hover:to-amber-500 active:scale-[0.98]" type="submit">
                  Search colleges
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* Live Database Stats */}
        <section className="border-y border-slate-200/90 bg-[#eef4f7] py-8 sm:py-10" aria-label="Verified data coverage">
          <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-5 lg:grid-cols-[250px_minmax(0,1fr)] lg:items-center lg:gap-8 lg:px-6">
            <div className="flex items-start gap-4 lg:block">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-action text-white shadow-soft">
                <Database aria-hidden="true" size={23} />
              </span>
              <div className="min-w-0 lg:mt-4">
                <p className="section-kicker">Live database</p>
                <h2 className="mt-1 text-xl font-bold text-ink">Published CAP records</h2>
                <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">Verified coverage currently available to the predictors and college research tools.</p>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
              {statistics.map((statistic) => {
                const StatisticIcon = statistic.icon;
                return (
                  <div key={statistic.label} className="min-w-0 rounded-lg border border-white/80 bg-white/90 p-4 shadow-[0_8px_24px_rgba(23,32,51,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-soft sm:p-5">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-md ${statistic.iconStyle}`}>
                      <StatisticIcon aria-hidden="true" size={18} />
                    </span>
                    <dt className="mt-4 text-2xl font-extrabold text-ink sm:text-3xl">{statistic.value}</dt>
                    <dd className="mt-1 text-xs font-medium leading-5 text-slate-600 sm:text-sm">{statistic.label}</dd>
                  </div>
                );
              })}
            </dl>
          </div>
        </section>

        {/* Choose Admission Route Section */}
        <section className="mx-auto max-w-7xl px-4 py-12 md:py-16" aria-labelledby="admission-route-heading">
          <div className="grid gap-3 md:grid-cols-[0.8fr_1.2fr] md:items-center md:gap-8">
            <div>
              <p className="section-kicker">Choose your admission route</p>
              <h2 id="admission-route-heading" className="mt-2 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">Choose your college predictor</h2>
            </div>
            <p className="max-w-3xl text-sm leading-6 text-slate-600">
              First-Year and Direct Second-Year admissions use different cutoff records and eligibility rules. Select the route that matches your current qualification.
            </p>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {admissionRoutes.map((route) => (
              <article key={route.code} className={`surface-card overflow-hidden border-t-4 ${route.accent} ${route.cardHoverStyle} transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5`}>
                <div className="grid gap-5 p-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${route.iconStyle} shadow-md`}>
                        <GraduationCap aria-hidden="true" size={22} />
                      </span>
                      <div>
                        <p className="text-xs font-semibold uppercase text-slate-400">{route.eyebrow}</p>
                        <p className={`text-xs font-bold ${route.codeStyle}`}>{route.code} admission</p>
                      </div>
                    </div>
                    <h3 className="mt-4 text-xl font-bold leading-7 text-slate-900">{route.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{route.description}</p>
                  </div>
                  <span className={`rounded-full border px-3.5 py-1 text-xs font-bold ${route.badgeStyle}`}>Latest: {route.latestYear}</span>
                </div>

                <dl className="grid grid-cols-2 border-y border-slate-200/80 bg-slate-50/70 text-center">
                  <div className="border-r border-slate-200/80 px-4 py-3.5">
                    <dt className="text-xl sm:text-2xl font-extrabold text-slate-900">{route.institutes.toLocaleString("en-IN")}</dt>
                    <dd className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Current institutes</dd>
                  </div>
                  <div className="px-4 py-3.5">
                    <dt className={`text-xl sm:text-2xl font-extrabold ${route.code === "FE" ? "text-indigo-600" : "text-emerald-600"}`}>{route.cutoffs.toLocaleString("en-IN")}</dt>
                    <dd className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Verified cutoffs</dd>
                  </div>
                </dl>

                <div className="p-5 md:px-6">
                  <Link className={`focus-ring flex min-h-11 w-full items-center justify-center gap-2 rounded-md px-4 text-sm font-bold transition-colors ${route.actionStyle}`} href={route.href}>
                    {route.action} <ArrowRight aria-hidden="true" size={17} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-500">Counts come from currently published PostgreSQL cutoff datasets and update when an administrator publishes new verified data.</p>
        </section>

        {/* How It Works Section */}
        <section className="border-y border-slate-200 bg-[#f3f6fb]">
          <div className="mx-auto max-w-7xl px-4 py-12 md:py-16">
            <div className="max-w-2xl">
              <p className="section-kicker">How it works</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">From profile to explainable options</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">The predictor keeps admission possibility, college strength and personal preference separate.</p>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step, index) => (
                <article key={step.title} className="group rounded-lg border border-white/90 bg-white/90 p-6 shadow-soft transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 hover:bg-white hover:shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className={`flex h-11 w-11 items-center justify-center rounded-lg shadow-xs transition-transform duration-200 group-hover:scale-105 ${step.iconStyle}`}>
                      <step.icon aria-hidden="true" size={20} />
                    </span>
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-500">0{index + 1}</span>
                  </div>
                  <h3 className="mt-5 font-bold text-slate-900 text-base">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{step.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Evidence Charts Component */}
        <HomeEvidenceCharts coverage={liveStats.cutoffCoverage} />

        {/* Built for Decisions Features Section */}
        <section className="border-y border-slate-200 bg-[#f1f7f6]">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 md:grid-cols-[0.8fr_1.2fr] md:items-start md:py-20">
            <div>
              <p className="section-kicker">Built for decisions</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Useful evidence, without pretending certainty</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">Every prediction explains the exact historical record used. Missing college information is hidden or clearly marked instead of being invented.</p>
              <Link className="mt-6 inline-flex min-h-11 items-center gap-2 font-bold text-indigo-600 transition-colors hover:text-indigo-700" href="/college-index">
                Explore top Maharashtra engineering colleges <ArrowRight aria-hidden="true" size={17} />
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {features.map((feature) => (
                <article key={feature.title} className="surface-card p-5 transition-all duration-200 hover:border-indigo-200 hover:shadow-md">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 shadow-xs">
                    <feature.icon aria-hidden="true" size={20} />
                  </span>
                  <h3 className="mt-4 font-bold text-slate-900">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{feature.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Questions Students Ask Section */}
        <section className="mx-auto max-w-7xl px-4 py-14 md:py-20">
          <div className="grid gap-8 md:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="section-kicker">Questions students ask</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Clear answers before CAP</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">No login is required to use either the First-Year or Direct Second-Year predictor.</p>
            </div>
            <div className="divide-y divide-slate-200 border-y border-slate-200">
              {questions.map(([question, answer]) => (
                <details key={question} className="group py-4">
                  <summary className="cursor-pointer list-none pr-8 font-bold text-slate-900 transition-colors hover:text-indigo-600">{question}</summary>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Bottom Section: 2 Separated Horizontal Cards */}
        <section className="border-y border-slate-200 bg-[#f5f7fb]">
          <div className="mx-auto max-w-7xl px-4 py-12 md:py-16">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Option 1: FE Horizontal Card */}
              <div className="surface-card border-l-4 border-indigo-600 p-6 flex flex-col justify-between sm:flex-row sm:items-center sm:gap-6 transition-all duration-200 hover:shadow-xl hover:border-indigo-500">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="tag tag-action">After Class 12</span>
                    <span className="text-xs font-bold text-indigo-600">FE Admission</span>
                  </div>
                  <h3 className="mt-2 text-lg font-bold text-slate-900">First-Year B.E. / B.Tech</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-600">MHT-CET score & eligibility based predictor.</p>
                </div>
                <div className="mt-4 shrink-0 sm:mt-0">
                  <Link className="btn-primary focus-ring rounded-xl px-5 py-2.5 text-xs font-bold shadow-md" href="/fe-predictor">
                    First-Year Predictor <ArrowRight aria-hidden="true" size={16} />
                  </Link>
                </div>
              </div>

              {/* Option 2: DSE Horizontal Card */}
              <div className="surface-card border-l-4 border-emerald-600 p-6 flex flex-col justify-between sm:flex-row sm:items-center sm:gap-6 transition-all duration-200 hover:shadow-xl hover:border-emerald-500">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="tag tag-success">After Diploma</span>
                    <span className="text-xs font-bold text-emerald-600">DSE Admission</span>
                  </div>
                  <h3 className="mt-2 text-lg font-bold text-slate-900">Direct Second-Year (DSE)</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-600">Diploma % & lateral entry branch predictor.</p>
                </div>
                <div className="mt-4 shrink-0 sm:mt-0">
                  <Link className="btn-secondary focus-ring rounded-xl px-5 py-2.5 text-xs font-bold" href="/dse-predictor">
                    Direct Second-Year Predictor <GraduationCap aria-hidden="true" size={16} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
