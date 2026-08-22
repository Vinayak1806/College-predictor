import { BookmarkCheck, GitCompareArrows, ListOrdered, ShieldCheck, Sparkles } from "lucide-react";
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
      <main className="page-shell soft-grid-bg mx-auto flex min-h-[calc(100vh-68px)] w-full max-w-6xl items-center justify-center px-4 py-8 sm:px-5 lg:px-6 lg:py-12">
        <div className="enter-up w-full overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xl lg:grid lg:grid-cols-12">
          {/* Information & Feature Branding (Left Side - Soft Light Theme) */}
          <div
            className="relative flex flex-col justify-between overflow-hidden p-8 text-slate-900 sm:p-10 lg:col-span-6 xl:col-span-7 lg:p-12"
            style={{ background: "linear-gradient(135deg, #f0f7ff 0%, #f5f3ff 50%, #eef2ff 100%)" }}
          >
            {/* Ambient background glows */}
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-200/40 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-indigo-200/40 blur-3xl" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-indigo-50/90 px-3.5 py-1.5 text-xs font-bold text-indigo-700 backdrop-blur-md shadow-2xs">
                <Sparkles className="text-indigo-600" size={14} />
                Student Decision Workspace
              </div>

              <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl leading-tight">
                Keep your admission planning in one place
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Save the colleges you are considering, compare options, and continue building your CAP preference list on any device.
              </p>

              <div className="mt-8 space-y-4">
                <div className="group flex items-start gap-4 rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-2xs backdrop-blur-md transition-all hover:border-indigo-300 hover:bg-white hover:shadow-xs">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 border border-indigo-200/60">
                    <BookmarkCheck aria-hidden="true" size={20} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Saved college choices</h2>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-600">Keep useful college and branch options ready for review anytime.</p>
                  </div>
                </div>

                <div className="group flex items-start gap-4 rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-2xs backdrop-blur-md transition-all hover:border-sky-300 hover:bg-white hover:shadow-xs">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700 border border-sky-200/60">
                    <GitCompareArrows aria-hidden="true" size={20} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">College comparisons</h2>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-600">Return to your saved comparisons without searching for options again.</p>
                  </div>
                </div>

                <div className="group flex items-start gap-4 rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-2xs backdrop-blur-md transition-all hover:border-emerald-300 hover:bg-white hover:shadow-xs">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 border border-emerald-200/60">
                    <ListOrdered aria-hidden="true" size={20} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">CAP preference list</h2>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-600">Organize, save, and download your final official planning list.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative z-10 mt-10 border-t border-slate-200/80 pt-6 text-xs text-slate-500 flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="text-emerald-600" size={15} /> Secure Student Sign In
              </span>
              <span className="font-semibold text-slate-600">Admission Compass</span>
            </div>
          </div>

          {/* Student Sign In Form (Right Side) */}
          <div className="flex flex-col justify-between bg-white p-8 sm:p-10 lg:col-span-6 xl:col-span-5 lg:p-12">
            <div>
              <div className="flex items-center justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-action border border-indigo-100 shadow-xs">
                  <ShieldCheck aria-hidden="true" size={22} />
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                  Student Sign In
                </span>
              </div>

              <h2 className="mt-6 text-2xl font-bold tracking-tight text-ink">Sign in to Admission Compass</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Use your Google account for a quick, secure student login.
              </p>

              <div className="mt-8 space-y-5">
                <GoogleSignInButton configured={studentAuthConfigured} callbackURL={callbackURL} />

                {!studentAuthConfigured ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-xs leading-relaxed text-amber-900 shadow-2xs">
                    Login is ready in the code but Google credentials are not configured. Add the four auth values from <code>.env.example</code> to <code>.env</code>.
                  </div>
                ) : null}

                <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3.5">
                  <ShieldCheck aria-hidden="true" className="mt-0.5 shrink-0 text-emerald-600" size={16} />
                  <p className="text-xs leading-relaxed text-slate-500">
                    We use your Google name, email, and profile image only for your account. Prediction tools remain free and accessible without signing in.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 border-t border-line pt-6">
              <Link className="focus-ring flex min-h-12 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 shadow-2xs transition-all hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 hover:shadow-xs" href="/fe-predictor">
                Continue without login
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
