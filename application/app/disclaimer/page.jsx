import Link from "next/link";
import { SiteHeader } from "../../components/SiteHeader";

export const metadata = {
  title: "Admission Disclaimer",
  description: "Understand how Admission Compass uses historical Maharashtra engineering cutoff data and why predictions cannot guarantee admission.",
  alternates: { canonical: "/disclaimer" }
};

export default function DisclaimerPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl px-4 py-10">
        <header className="border-l-4 border-warning pl-4">
          <p className="text-xs font-semibold uppercase text-warning">Read before using predictions</p>
          <h1 className="mt-1 text-3xl font-semibold text-ink">Admission Disclaimer</h1>
        </header>
        <div className="mt-8 grid gap-7 text-sm leading-7 text-slate-700">
          <p>Admission Compass compares a student&apos;s score and eligible seat types with verified historical FE or DSE CAP cutoff records. It does not search PDFs during prediction and it does not predict the decisions of the CET Cell, colleges or other applicants.</p>
          <section><h2 className="text-xl font-semibold text-ink">What the labels mean</h2><p className="mt-2">Safe, Target, Ambitious and Highly Ambitious describe historical score margins after confidence adjustments. Safe does not mean guaranteed, and Highly Ambitious does not mean impossible.</p></section>
          <section><h2 className="text-xl font-semibold text-ink">Why future results change</h2><p className="mt-2">Cutoffs can change because of applicant demand, examination performance, seat availability, new branches, institute changes, reservation rules, CAP-round movement and government decisions.</p></section>
          <section><h2 className="text-xl font-semibold text-ink">Official verification</h2><p className="mt-2">Always verify the current information on the <a className="font-semibold text-action underline" href="https://cetcell.mahacet.org/" target="_blank" rel="noreferrer">Maharashtra CET Cell website</a> and the applicable information brochure before taking action.</p></section>
          <p className="border-t border-line pt-5">The <Link className="font-semibold text-action underline" href="/cutoffs">Cutoff Explorer</Link> shows the academic year, CAP round, exact seat type, source PDF and source page whenever that information is available.</p>
        </div>
      </main>
    </>
  );
}
