import Link from "next/link";
import { SiteHeader } from "../../components/SiteHeader";

export const metadata = {
  title: "Terms of Use",
  robots: { index: false, follow: true }
};

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main className="page-shell mx-auto w-full max-w-4xl px-4 py-10 sm:px-5 lg:px-6">
        <header className="border-l-4 border-action pl-4">
          <p className="text-xs font-semibold uppercase text-action">Responsible use</p>
          <h1 className="mt-1 text-3xl font-semibold text-ink">Terms of Use</h1>
          <p className="mt-2 text-sm text-slate-500">Last updated: August 3, 2026</p>
        </header>
        <div className="legal-content mt-8 text-sm leading-7 text-slate-700">
          <section><h2 className="text-xl font-semibold text-ink">Educational decision support</h2><p className="mt-2">Admission Compass is an independent research tool. It is not operated, endorsed or approved by the Maharashtra State Common Entrance Test Cell or any college, university or government authority.</p></section>
          <section><h2 className="text-xl font-semibold text-ink">No admission guarantee</h2><p className="mt-2">Predictions, margins, confidence labels and admission zones are calculations based on historical records. They do not guarantee eligibility, seat availability, allotment or admission in a future CAP round.</p></section>
          <section><h2 className="text-xl font-semibold text-ink">Student responsibility</h2><p className="mt-2">You must verify current eligibility rules, schedules, institute codes, branch codes, fees, seat matrices and final cutoffs through official sources before submitting an application or preference list.</p></section>
          <section><h2 className="text-xl font-semibold text-ink">Accounts and acceptable use</h2><p className="mt-2">Provide accurate account information, protect your login and do not attempt to bypass access controls, overload APIs, scrape restricted pages, alter datasets without authorization or interfere with other users.</p></section>
          <section><h2 className="text-xl font-semibold text-ink">Data availability</h2><p className="mt-2">The service may contain incomplete or delayed information and may be changed, suspended or corrected. Missing values are not evidence that a college lacks a feature or approval.</p></section>
          <section><h2 className="text-xl font-semibold text-ink">Limitation</h2><p className="mt-2">Use the service at your own discretion. To the extent permitted by applicable law, the service is provided without warranties and is not responsible for admission decisions made without checking official documents.</p></section>
          <p className="border-t border-line pt-5">Read the <Link className="font-semibold text-action underline" href="/privacy">Privacy Policy</Link> and <Link className="font-semibold text-action underline" href="/disclaimer">Admission Disclaimer</Link>.</p>
        </div>
      </main>
    </>
  );
}
