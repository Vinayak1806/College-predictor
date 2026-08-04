"use client";

import { AlertCircle, Database, Eye, EyeOff, FileCheck2, LockKeyhole, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SiteHeader } from "../../../components/SiteHeader";

export default function AdminLoginPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const [showToken, setShowToken] = useState(false);

  async function signIn(event) {
    event.preventDefault();
    setWorking(true);
    setError("");
    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Admin sign-in failed.");
      router.push("/admin");
      router.refresh();
    } catch (signInError) {
      setError(signInError.message);
    } finally {
      setWorking(false);
    }
  }

  return (
    <>
      <SiteHeader showStudentAccount={false} />
      <main className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-stretch px-4 py-10 lg:grid-cols-[minmax(0,1fr)_460px] lg:py-14">
        <section className="order-2 enter-up flex flex-col justify-center rounded-b-lg bg-[#123448] px-6 py-10 text-white lg:order-1 lg:rounded-l-lg lg:rounded-br-none lg:rounded-tr-none lg:px-10">
          <span className="flex h-12 w-12 items-center justify-center rounded bg-white/10 text-cyan-100">
            <ShieldCheck aria-hidden="true" size={24} />
          </span>
          <p className="mt-6 text-xs font-semibold uppercase text-cyan-200">Restricted administration</p>
          <h1 className="mt-2 max-w-lg text-3xl font-semibold leading-tight">Manage official admission data securely</h1>
          <p className="mt-4 max-w-lg text-sm leading-6 text-slate-200">
            Administrator access is separate from student accounts and is required for dataset review, approval, publishing, and rollback.
          </p>

          <div className="mt-8 grid gap-5 border-t border-white/15 pt-6">
            <div className="flex items-start gap-3">
              <Database aria-hidden="true" className="mt-0.5 shrink-0 text-cyan-200" size={19} />
              <div>
                <h2 className="text-sm font-semibold">Protected dataset access</h2>
                <p className="mt-1 text-xs leading-5 text-slate-300">Upload and inspect FE and DSE source records.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <FileCheck2 aria-hidden="true" className="mt-0.5 shrink-0 text-emerald-300" size={19} />
              <div>
                <h2 className="text-sm font-semibold">Controlled publishing</h2>
                <p className="mt-1 text-xs leading-5 text-slate-300">Review validation issues before records reach students.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="order-1 enter-up overflow-hidden rounded-t-lg border border-b-0 border-line bg-white lg:order-2 lg:rounded-r-lg lg:rounded-bl-none lg:rounded-tl-none lg:border-b lg:border-l-0">
          <div className="border-b border-line px-6 py-6 sm:px-8">
            <span className="flex h-11 w-11 items-center justify-center rounded bg-cyan-50 text-action">
              <LockKeyhole aria-hidden="true" size={21} />
            </span>
            <h2 className="mt-5 text-2xl font-semibold text-ink">Admin sign in</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Enter the private token configured on the application server.</p>
          </div>

          <form className="grid gap-5 px-6 py-6 sm:px-8" onSubmit={signIn}>
            <label className="grid gap-2 text-sm font-medium text-ink" htmlFor="admin-token">
              Admin token
            </label>
            <div className="relative -mt-3">
              <input
                id="admin-token"
                className="focus-ring min-h-12 w-full rounded border border-line px-3 pr-12"
                type={showToken ? "text" : "password"}
                autoComplete="current-password"
                required
                aria-invalid={Boolean(error)}
                aria-describedby="admin-token-help"
                value={token}
                onChange={(event) => setToken(event.target.value)}
              />
              <button
                className="focus-ring absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-500 hover:text-ink"
                type="button"
                title={showToken ? "Hide admin token" : "Show admin token"}
                aria-label={showToken ? "Hide admin token" : "Show admin token"}
                onClick={() => setShowToken((current) => !current)}
              >
                {showToken ? <EyeOff aria-hidden="true" size={18} /> : <Eye aria-hidden="true" size={18} />}
              </button>
            </div>
            <p id="admin-token-help" className="-mt-3 text-xs leading-5 text-slate-500">
              The token is checked on the server and is never displayed in the dashboard.
            </p>
            {error ? (
              <div className="flex items-start gap-2 rounded border border-danger bg-red-50 p-3 text-sm text-danger" role="alert">
                <AlertCircle aria-hidden="true" className="mt-0.5 shrink-0" size={17} />
                <p>{error}</p>
              </div>
            ) : null}
            <button
              className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded bg-action px-4 text-sm font-semibold text-white disabled:opacity-60"
              type="submit"
              disabled={working}
            >
              <ShieldCheck aria-hidden="true" size={17} />
              {working ? "Checking access..." : "Open Admin Dashboard"}
            </button>

            <div className="grid gap-2 border-t border-line pt-4 text-center text-sm">
              <Link className="focus-ring font-medium text-action underline" href="/login">Student sign in</Link>
              <Link className="focus-ring text-slate-600 underline" href="/">Return to student website</Link>
            </div>
          </form>
        </section>
      </main>
    </>
  );
}
