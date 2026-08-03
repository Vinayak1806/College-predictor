import { ShieldCheck } from "lucide-react";
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
      <main className="mx-auto w-full max-w-lg px-4 py-12 sm:py-16">
        <section className="rounded border border-line bg-white p-6 shadow-sm sm:p-8">
          <span className="flex h-11 w-11 items-center justify-center rounded bg-cyan-50 text-action">
            <ShieldCheck aria-hidden="true" size={22} />
          </span>
          <h1 className="mt-5 text-2xl font-semibold text-ink">Student login</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Sign in to keep your saved colleges, CAP lists, and comparisons private and available on another device.
          </p>

          <div className="mt-6">
            <GoogleSignInButton configured={studentAuthConfigured} callbackURL={callbackURL} />
          </div>

          {!studentAuthConfigured ? (
            <div className="mt-5 border-l-4 border-amber-500 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
              Login is ready in the code but Google credentials are not configured. Add the four auth values from <code>.env.example</code> to <code>.env</code>.
            </div>
          ) : null}

          <p className="mt-5 text-xs leading-5 text-slate-500">
            Prediction remains available without login. We use your Google name, email, and profile image only for your account.
          </p>
        </section>
      </main>
    </>
  );
}
