"use client";

import { AlertCircle, ArrowLeft, Database, Eye, EyeOff, FileCheck2, Key, LockKeyhole, RefreshCw, ShieldCheck, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SiteHeader } from "../../../components/SiteHeader";

export default function AdminLoginPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

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
      <main className="page-shell soft-grid-bg mx-auto flex min-h-[calc(100vh-68px)] w-full max-w-6xl items-center justify-center px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="enter-up w-full overflow-hidden rounded-3xl border border-slate-700/40 bg-slate-950 shadow-2xl lg:grid lg:grid-cols-12">
          {/* Information & Security Branding (Left Side) */}
          <div
            className="relative flex flex-col justify-between overflow-hidden p-8 text-white sm:p-10 lg:col-span-6 xl:col-span-7 lg:p-12"
            style={{ background: "linear-gradient(135deg, #020617 0%, #0b2232 50%, #10334a 100%)" }}
          >
            {/* Background Decorative Ambient Blur */}
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3.5 py-1.5 text-xs font-semibold text-cyan-300 backdrop-blur-md">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400"></span>
                </span>
                Restricted Admin Access
              </div>

              <h1 className="mt-6 text-3xl font-extrabold tracking-tight sm:text-4xl leading-tight text-white">
                Data Quality & Governance Portal
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                Manage official Maharashtra engineering college admission datasets, cutoffs, seat matrices, and automated validation rules.
              </p>

              <div className="mt-8 space-y-4">
                <div
                  className="group flex items-start gap-4 rounded-2xl border border-slate-700/60 p-4 transition-all hover:border-cyan-400/40"
                  style={{ backgroundColor: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(8px)" }}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    <Database aria-hidden="true" size={20} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white">Protected Dataset Management</h2>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-300">Upload, parse, and verify official FE & DSE cutoffs and seat matrices.</p>
                  </div>
                </div>

                <div
                  className="group flex items-start gap-4 rounded-2xl border border-slate-700/60 p-4 transition-all hover:border-emerald-400/40"
                  style={{ backgroundColor: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(8px)" }}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <FileCheck2 aria-hidden="true" size={20} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white">Automated Verification & Publishing</h2>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-300">Review anomalies and bulk-approve institutes before data is served to students.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative z-10 mt-10 border-t border-white/10 pt-6 text-xs text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="text-cyan-400" size={15} /> 256-bit Encrypted Session
              </span>
              <span>Admission Compass Admin</span>
            </div>
          </div>

          {/* Admin Sign In Form (Right Side) */}
          <div className="flex flex-col justify-between bg-white p-8 sm:p-10 lg:col-span-6 xl:col-span-5 lg:p-12">
            <div>
              <div className="flex items-center justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-action border border-cyan-100 shadow-xs">
                  <LockKeyhole aria-hidden="true" size={22} />
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                  Secure Access
                </span>
              </div>

              <h2 className="mt-6 text-2xl font-bold tracking-tight text-ink">Admin Sign In</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Enter your private server access token to access the Data Quality Centre.
              </p>

              <form className="mt-8 space-y-5" onSubmit={signIn}>
                <div>
                  <label className="block text-sm font-semibold text-ink" htmlFor="admin-token">
                    Admin token
                  </label>
                  <div className="relative mt-2">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                      <Key size={18} />
                    </div>
                    <input
                      id="admin-token"
                      className="focus-ring min-h-12 w-full rounded-xl border border-line bg-slate-50/50 pl-10 pr-12 text-sm font-mono text-ink placeholder:font-sans placeholder:text-slate-400 transition-all focus:bg-white focus:border-action"
                      type={showToken ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="Enter server admin token"
                      required
                      disabled={!hydrated || working}
                      aria-invalid={Boolean(error)}
                      aria-describedby="admin-token-help"
                      value={token}
                      onChange={(event) => setToken(event.target.value)}
                    />
                    <button
                      className="focus-ring absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
                      type="button"
                      title={showToken ? "Hide admin token" : "Show admin token"}
                      aria-label={showToken ? "Hide admin token" : "Show admin token"}
                      onClick={() => setShowToken((current) => !current)}
                    >
                      {showToken ? <EyeOff aria-hidden="true" size={18} /> : <Eye aria-hidden="true" size={18} />}
                    </button>
                  </div>
                  <p id="admin-token-help" className="mt-2 text-xs text-slate-500">
                    The token is validated on the application server and strictly scoped.
                  </p>
                </div>

                {error ? (
                  <div className="flex items-start gap-2.5 rounded-xl border border-danger/30 bg-red-50/80 p-3.5 text-sm text-danger shadow-xs" role="alert">
                    <AlertCircle aria-hidden="true" className="mt-0.5 shrink-0" size={18} />
                    <p className="leading-snug">{error}</p>
                  </div>
                ) : null}

                <button
                  className="focus-ring inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-action via-indigo-600 to-indigo-700 px-5 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 hover:from-action hover:to-indigo-800 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-60 disabled:pointer-events-none disabled:transform-none"
                  type="submit"
                  disabled={working || !hydrated}
                >
                  {working ? (
                    <RefreshCw aria-hidden="true" className="animate-spin" size={18} />
                  ) : (
                    <ShieldCheck aria-hidden="true" size={18} />
                  )}
                  {working ? "Authenticating..." : "Open Admin Dashboard"}
                </button>
              </form>
            </div>

            <div className="mt-8 border-t border-line pt-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs">
                <Link
                  className="focus-ring inline-flex items-center gap-1.5 font-medium text-action hover:underline"
                  href="/login"
                >
                  <User size={14} /> Student sign in
                </Link>
                <Link
                  className="focus-ring inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-900 transition-colors"
                  href="/"
                >
                  <ArrowLeft size={14} /> Return to homepage
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
