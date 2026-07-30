"use client";

import { AlertCircle, LockKeyhole, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SiteHeader } from "../../../components/SiteHeader";

export default function AdminLoginPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);

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
      <SiteHeader />
      <main className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl place-items-center px-4 py-10">
        <section className="w-full max-w-md overflow-hidden rounded-lg border border-line bg-white">
          <div className="border-b border-line px-5 py-5">
            <span className="flex h-11 w-11 items-center justify-center rounded bg-action text-white">
              <LockKeyhole aria-hidden="true" size={21} />
            </span>
            <p className="mt-4 text-xs font-semibold uppercase text-action">Restricted administration</p>
            <h1 className="mt-1 text-2xl font-semibold text-ink">Admin sign in</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Enter the server-configured admin token to manage official datasets.
            </p>
          </div>

          <form className="grid gap-4 p-5" onSubmit={signIn}>
            <label className="grid gap-1.5 text-sm font-medium text-ink">
              Admin token
              <input
                className="focus-ring min-h-11 rounded border border-line px-3"
                type="password"
                autoComplete="current-password"
                required
                value={token}
                onChange={(event) => setToken(event.target.value)}
              />
            </label>
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
            <Link className="text-center text-sm font-medium text-action underline" href="/">Return to student website</Link>
          </form>
        </section>
      </main>
    </>
  );
}
