"use client";

import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import { authClient } from "../lib/authClient";

export function GoogleSignInButton({ configured, callbackURL = "/account" }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function signIn() {
    setLoading(true);
    setError("");

    const result = await authClient.signIn.social({
      provider: "google",
      callbackURL
    });

    if (result?.error) {
      setError("Google sign-in could not start. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-3">
      <button
        type="button"
        disabled={!configured || loading}
        onClick={signIn}
        className="focus-ring flex min-h-14 w-full items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-action hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <LoaderCircle aria-hidden="true" className="animate-spin" size={18} />
        ) : (
          <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-[#4285f4]">G</span>
        )}
        {loading ? "Opening Google..." : "Continue with Google"}
      </button>
      {error ? <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p> : null}
    </div>
  );
}
