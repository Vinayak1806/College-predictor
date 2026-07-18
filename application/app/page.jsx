import Link from "next/link";
import { SiteHeader } from "../components/SiteHeader";

const features = [
  "Official CAP cutoff records converted into structured tables",
  "FE and DSE prediction paths kept separate",
  "Seat-type eligibility includes OPEN seats for reserved-category students",
  "Result explanations show year, round, seat type, and cutoff margin"
];

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="border-b border-line bg-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-[1.1fr_0.9fr] md:py-14">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-action">Maharashtra FE and DSE</p>
              <h1 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight text-ink md:text-5xl">
                College predictions from structured CAP cutoff data.
              </h1>
              <p className="mt-4 max-w-2xl text-base text-slate-600">
                The app converts official cutoff PDFs into PostgreSQL records, validates them, and uses eligibility rules before showing prediction results.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link className="focus-ring min-h-11 rounded bg-action px-5 py-3 text-center font-semibold text-white" href="/fe-predictor">
                  FE Predictor
                </Link>
                <Link className="focus-ring min-h-11 rounded border border-line px-5 py-3 text-center font-semibold" href="/dse-predictor">
                  DSE Predictor
                </Link>
              </div>
            </div>
            <div className="rounded-lg border border-line bg-panel p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Pipeline status</h2>
              <dl className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded bg-white p-3">
                  <dt className="text-xs text-slate-500">Datasets</dt>
                  <dd className="text-2xl font-semibold">10</dd>
                </div>
                <div className="rounded bg-white p-3">
                  <dt className="text-xs text-slate-500">Clean cutoffs</dt>
                  <dd className="text-2xl font-semibold">103k+</dd>
                </div>
                <div className="rounded bg-white p-3">
                  <dt className="text-xs text-slate-500">Years</dt>
                  <dd className="text-2xl font-semibold">2023-25</dd>
                </div>
                <div className="rounded bg-white p-3">
                  <dt className="text-xs text-slate-500">Storage</dt>
                  <dd className="text-2xl font-semibold">Postgres</dd>
                </div>
              </dl>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-10">
          <h2 className="text-xl font-semibold">How it works</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            {["PDF extraction", "CSV validation", "PostgreSQL import", "Prediction API"].map((step) => (
              <div key={step} className="rounded-lg border border-line bg-white p-4 text-sm font-medium">
                {step}
              </div>
            ))}
          </div>
          <div className="mt-8 grid gap-3 md:grid-cols-2">
            {features.map((feature) => (
              <p key={feature} className="rounded border border-line bg-white p-4 text-sm text-slate-700">{feature}</p>
            ))}
          </div>
          <div className="mt-8 rounded-lg border border-line bg-white p-4 text-sm text-slate-600">
            Disclaimer: This is not an official government platform and does not guarantee admission. Results are historical cutoff matches and should be verified against official sources.
          </div>
        </section>
      </main>
    </>
  );
}
