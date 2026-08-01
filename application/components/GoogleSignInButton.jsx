"use client";

import { LogIn } from "lucide-react";
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
    <div>
      <button
        type="button"
        disabled={!configured || loading}
        onClick={signIn}
        className="focus-ring flex min-h-11 w-full items-center justify-center gap-2 rounded bg-action px-4 text-sm font-semibold text-white hover:bg-[#11566d] disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        <LogIn aria-hidden="true" size={18} />
        {loading ? "Opening Google..." : "Continue with Google"}
      </button>
      {error ? <p className="mt-3 text-sm text-red-700" role="alert">{error}</p> : null}
    </div>
  );
}
