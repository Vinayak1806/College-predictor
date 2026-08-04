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
        className="focus-ring flex min-h-12 w-full items-center justify-center gap-3 rounded bg-action px-4 text-sm font-semibold text-white hover:bg-[#11566d] disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {loading ? (
          <LoaderCircle aria-hidden="true" className="animate-spin" size={18} />
        ) : (
          <span aria-hidden="true" className="flex h-6 w-6 items-center justify-center rounded-sm bg-white text-sm font-bold text-[#4285f4]">G</span>
        )}
        {loading ? "Opening Google..." : "Continue with Google"}
      </button>
      {error ? <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p> : null}
    </div>
  );
}
