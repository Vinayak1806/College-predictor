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
import { SiteHeader } from "../components/SiteHeader";

const statistics = [
  ["702", "Engineering colleges"],
  ["103,638", "Verified cutoff records"],
  ["148", "Cities covered"],
  ["93", "Exact seat types"]
];

const steps = [
  { icon: GraduationCap, title: "Enter your profile", text: "Add percentile, category, gender and home university." },
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
  ["Is DSE prediction available?", "The DSE interface is being prepared, but predictions will remain disabled until official DSE cutoff datasets are imported and validated."],
  ["Is the College Index an official ranking?", "No. It is a transparent historical-demand research signal. It does not claim to measure teaching quality, placements or campus life."]
];

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="relative min-h-[calc(100svh-104px)] overflow-hidden bg-[#102a43] text-white">
          <Image
            src="/images/engineering-students-campus.png"
            alt="Engineering students walking through a modern college campus"
            fill
            priority
            sizes="100vw"
            className="object-cover object-[62%_center]"
          />
          <div className="absolute inset-0 bg-black/55" />
          <div className="relative mx-auto flex min-h-[calc(100svh-104px)] max-w-7xl items-center px-4 py-12">
            <div className="enter-up max-w-3xl">
              <div className="inline-flex items-center gap-2 border-l-2 border-amber-400 pl-3 text-sm font-semibold text-white">
                <CheckCircle2 aria-hidden="true" size={17} />
                Structured Maharashtra CAP data
              </div>
              <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-tight md:text-6xl">
                Find engineering colleges that match your real admission profile.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-100 md:text-lg">
                Compare your percentile with eligible seat types and multi-year FE cutoffs, then research every college before building your CAP choices.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded bg-action px-5 font-semibold text-white shadow-lg hover:bg-[#11566d]" href="/fe-predictor">
                  Predict my colleges <ArrowRight aria-hidden="true" size={18} />
                </Link>
                <Link className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded border border-white/60 bg-white/10 px-5 font-semibold text-white backdrop-blur-sm hover:bg-white/20" href="/colleges">
                  Explore colleges <Search aria-hidden="true" size={18} />
                </Link>
              </div>

              <form action="/colleges" className="mt-8 flex max-w-2xl overflow-hidden rounded bg-white shadow-xl">
                <label className="sr-only" htmlFor="home-college-search">Search college name, code or city</label>
                <div className="flex min-w-0 flex-1 items-center gap-3 px-4">
                  <Search aria-hidden="true" className="shrink-0 text-slate-400" size={19} />
                  <input id="home-college-search" name="q" className="min-h-12 min-w-0 flex-1 border-0 bg-transparent text-sm text-ink outline-none" placeholder="Search college name or institute code" />
                </div>
                <button className="focus-ring min-h-12 bg-[#d97706] px-5 text-sm font-semibold text-white hover:bg-[#b85f05]" type="submit">Search</button>
              </form>
            </div>
          </div>
        </section>

        <section className="border-b border-line bg-white" aria-label="Verified data coverage">
          <dl className="mx-auto grid max-w-7xl grid-cols-2 px-4 md:grid-cols-4">
            {statistics.map(([value, label]) => (
              <div key={label} className="border-b border-line px-3 py-5 text-center even:border-l md:border-b-0 md:border-l md:first:border-l-0">
                <dt className="text-2xl font-bold text-ink">{value}</dt>
                <dd className="mt-1 text-xs text-slate-500">{label}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-14 md:py-20">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase text-action">How it works</p>
            <h2 className="mt-2 text-3xl font-bold text-ink">From profile to explainable options</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">The predictor keeps admission possibility, college strength and personal preference separate.</p>
          </div>
          <div className="mt-8 grid gap-px overflow-hidden rounded border border-line bg-line md:grid-cols-4">
            {steps.map((step, index) => (
              <article key={step.title} className="bg-white p-5">
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded bg-cyan-50 text-action"><step.icon aria-hidden="true" size={20} /></span>
                  <span className="text-xs font-semibold text-slate-400">0{index + 1}</span>
                </div>
                <h3 className="mt-5 font-semibold text-ink">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{step.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-line bg-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 md:grid-cols-[0.8fr_1.2fr] md:items-start md:py-20">
            <div>
              <p className="text-xs font-semibold uppercase text-action">Built for decisions</p>
              <h2 className="mt-2 text-3xl font-bold text-ink">Useful evidence, without pretending certainty</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">Every prediction explains the exact historical record used. Missing college information is hidden or clearly marked instead of being invented.</p>
              <Link className="mt-6 inline-flex min-h-11 items-center gap-2 font-semibold text-action" href="/college-index">View the historical demand index <ArrowRight aria-hidden="true" size={17} /></Link>
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
              <p className="mt-3 text-sm leading-6 text-slate-600">No login is required to run an FE prediction.</p>
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
          <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-10 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-action">Ready to check your options?</p>
              <h2 className="mt-2 text-2xl font-bold text-ink">Start with your MHT-CET percentile.</h2>
            </div>
            <Link className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded bg-action px-5 font-semibold text-white" href="/fe-predictor">Open FE Predictor <ArrowRight aria-hidden="true" size={18} /></Link>
          </div>
        </section>
      </main>
    </>
  );
}
