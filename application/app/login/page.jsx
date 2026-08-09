import { BookmarkCheck, GitCompareArrows, ListOrdered, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { SiteHeader } from "../../components/SiteHeader";
import { GoogleSignInButton } from "../../components/GoogleSignInButton";
import { studentAuthConfigured } from "../../lib/auth";

export const metadata = {
  title: "Student Login",
  robots: { index: false, follow: false }
};

function safeCallback(value) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/account";
}

export default async function LoginPage({ searchParams }) {
  const query = await searchParams;
  const callbackURL = safeCallback(query?.callbackURL);
  return (
    <>
      <SiteHeader />
      <main className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-10 px-4 py-10 lg:grid-cols-[minmax(0,1fr)_460px] lg:gap-16 lg:py-16">
        <section className="order-2 max-w-xl enter-up lg:order-1">
          <p className="text-xs font-semibold uppercase text-action">Student account</p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight text-ink sm:text-4xl">
            Keep your admission planning in one place
          </h1>
          <p className="mt-4 max-w-lg text-base leading-7 text-slate-600">
            Save the colleges you are considering, compare options, and continue building your CAP preference list on any device.
          </p>

          <div className="mt-8 divide-y divide-line border-y border-line">
            <div className="flex gap-4 py-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-cyan-50 text-action">
                <BookmarkCheck aria-hidden="true" size={20} />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-ink">Saved college choices</h2>
                <p className="mt-1 text-sm leading-5 text-slate-600">Keep useful college and branch options ready for review.</p>
              </div>
            </div>
            <div className="flex gap-4 py-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-blue-50 text-blue-700">
                <GitCompareArrows aria-hidden="true" size={20} />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-ink">College comparisons</h2>
                <p className="mt-1 text-sm leading-5 text-slate-600">Return to comparisons without searching for the same options again.</p>
              </div>
            </div>
            <div className="flex gap-4 py-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-emerald-50 text-emerald-700">
                <ListOrdered aria-hidden="true" size={20} />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-ink">CAP preference list</h2>
                <p className="mt-1 text-sm leading-5 text-slate-600">Organize, save, and download your final planning list.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="order-1 enter-up overflow-hidden rounded-lg border border-line bg-white shadow-raised lg:order-2">
          <div className="border-b border-line px-6 py-6 sm:px-8">
            <span className="flex h-11 w-11 items-center justify-center rounded bg-action text-white">
              <ShieldCheck aria-hidden="true" size={22} />
            </span>
            <h2 className="mt-5 text-2xl font-semibold text-ink">Sign in to Admission Compass</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Use your Google account for a quick and secure student login.
            </p>
          </div>

          <div className="px-6 py-6 sm:px-8">
            <GoogleSignInButton configured={studentAuthConfigured} callbackURL={callbackURL} />

            {!studentAuthConfigured ? (
              <div className="mt-5 border-l-4 border-amber-500 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
                Login is ready in the code but Google credentials are not configured. Add the four auth values from <code>.env.example</code> to <code>.env</code>.
              </div>
            ) : null}

            <div className="mt-6 flex items-start gap-3 border-t border-line pt-5">
              <ShieldCheck aria-hidden="true" className="mt-0.5 shrink-0 text-emerald-700" size={17} />
              <p className="text-xs leading-5 text-slate-500">
                We use your Google name, email, and profile image only for your account. Your admission prediction is still available without signing in.
              </p>
            </div>

            <Link className="focus-ring mt-5 flex min-h-11 items-center justify-center rounded border border-line px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50" href="/fe-predictor">
              Continue without login
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
