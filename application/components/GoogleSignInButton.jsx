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
        className="focus-ring flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-indigo-600 bg-indigo-600 px-5 text-sm font-bold text-white shadow-md transition-all hover:bg-indigo-700 hover:shadow-lg active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <LoaderCircle aria-hidden="true" className="animate-spin text-white" size={18} />
        ) : (
          <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-sm font-extrabold text-indigo-600 shadow-2xs">G</span>
        )}
        <span>{loading ? "Opening Google..." : "Continue with Google"}</span>
      </button>
      {error ? <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p> : null}
    </div>
  );
}
