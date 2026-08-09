"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "../lib/authClient";

export function DeleteAccountPanel() {
  const router = useRouter();
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function deleteAccount() {
    if (confirmation !== "DELETE") return;
    if (!window.confirm("Permanently delete this account and all saved Admission Compass data?")) return;

    setDeleting(true);
    setError("");
    try {
      const response = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Account deletion failed.");

      await authClient.signOut().catch(() => null);
      router.replace("/");
      router.refresh();
    } catch (deleteError) {
      setError(deleteError.message || "Account deletion failed.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="mt-10 border-t border-line pt-6">
      <h2 className="text-lg font-semibold text-ink">Delete account</h2>
      <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">Permanently removes your login, saved profiles, prediction history, comparisons, shortlists and CAP lists. This cannot be undone.</p>
      <div className="mt-4 flex max-w-xl flex-col gap-2 sm:flex-row">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Type DELETE to confirm</span>
          <input
            className="focus-ring min-h-11 w-full rounded border border-line px-3 text-sm"
            placeholder="Type DELETE to confirm"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
          />
        </label>
        <button
          className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded border border-danger px-4 text-sm font-semibold text-danger disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          disabled={confirmation !== "DELETE" || deleting}
          onClick={deleteAccount}
        >
          <Trash2 aria-hidden="true" size={17} /> {deleting ? "Deleting..." : "Delete permanently"}
        </button>
      </div>
      {error ? <p className="mt-2 text-sm text-danger" role="alert">{error}</p> : null}
    </section>
  );
}
