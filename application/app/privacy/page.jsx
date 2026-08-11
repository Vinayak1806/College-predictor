import Link from "next/link";
import { SiteHeader } from "../../components/SiteHeader";
import { SUPPORT_EMAIL } from "../../lib/site";

export const metadata = {
  title: "Privacy Policy",
  robots: { index: false, follow: true }
};

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="page-shell mx-auto w-full max-w-4xl px-4 py-10 sm:px-5 lg:px-6">
        <header className="border-l-4 border-action pl-4">
          <p className="text-xs font-semibold uppercase text-action">Data and trust</p>
          <h1 className="mt-1 text-3xl font-semibold text-ink">Privacy Policy</h1>
          <p className="mt-2 text-sm text-slate-500">Last updated: August 3, 2026</p>
        </header>

        <div className="legal-content mt-8 text-sm leading-7 text-slate-700">
          <section><h2 className="text-xl font-semibold text-ink">What the website processes</h2><p className="mt-2">Prediction forms send admission details to the server so matching cutoff records can be calculated. A prediction does not require an account. We do not intentionally store an anonymous student&apos;s prediction form in PostgreSQL.</p></section>
          <section><h2 className="text-xl font-semibold text-ink">Student accounts</h2><p className="mt-2">When you choose Google sign-in, the website receives the name, email address and profile image supplied by Google. Signed-in students can save predictor profiles, prediction history, comparisons and CAP preference lists to their account.</p></section>
          <section><h2 className="text-xl font-semibold text-ink">Browser storage</h2><p className="mt-2">The website uses browser storage for preference lists, comparisons, pending profiles and your analytics choice. This allows core tools to work without requiring login. Clearing browser data removes information stored only on that device.</p></section>
          <section><h2 className="text-xl font-semibold text-ink">Optional Analytics</h2><p className="mt-2">Google Analytics loads only after you accept it. Events describe product usage such as a completed First-Year or Direct Second-Year prediction, result count, filter counts and completed comparisons. We do not send percentile, diploma percentage, merit number, category, gender, email or saved college choices as analytics event parameters.</p></section>
          <section><h2 className="text-xl font-semibold text-ink">Cookies and security</h2><p className="mt-2">Authentication uses secure session cookies. Administrative access uses a separate protected session. Reasonable technical controls are used, but no internet service can promise absolute security.</p></section>
          <section><h2 className="text-xl font-semibold text-ink">Data sharing</h2><p className="mt-2">We do not sell student account information. Data may be processed by infrastructure, database, authentication, analytics or monitoring providers required to operate the service. Their use is limited by their own terms and privacy commitments.</p></section>
          <section><h2 className="text-xl font-semibold text-ink">Your choices</h2><p className="mt-2">You may use predictions without signing in, decline analytics, clear browser storage and remove saved profiles or history using account controls. Signed-in students can permanently delete their account and all associated saved data from the account page.</p></section>
          <section><h2 className="text-xl font-semibold text-ink">Contact</h2><p className="mt-2">For privacy questions or account-support requests, email <a className="font-semibold text-action underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p></section>
          <p className="border-t border-line pt-5">See the <Link className="font-semibold text-action underline" href="/terms">Terms of Use</Link> and <Link className="font-semibold text-action underline" href="/disclaimer">Admission Disclaimer</Link> for additional conditions.</p>
        </div>
      </main>
    </>
  );
}
