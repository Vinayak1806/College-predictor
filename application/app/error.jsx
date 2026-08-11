"use client";

import Link from "next/link";
import { AlertTriangle, Mail, RotateCcw } from "lucide-react";
import { useEffect } from "react";
import { SUPPORT_EMAIL } from "../lib/site";

export default function ErrorPage({ error, reset }) {
  useEffect(() => {
    console.error("Page rendering failed", error);
  }, [error]);

  return (
    <main className="page-shell soft-grid-bg mx-auto flex min-h-[65vh] w-full max-w-3xl items-center px-4 py-10 sm:px-5 lg:px-6">
      <section className="surface-card w-full p-6 sm:p-8">
        <AlertTriangle aria-hidden="true" className="text-warning" size={30} />
        <p className="mt-4 text-xs font-semibold uppercase text-action">Temporary problem</p>
        <h1 className="mt-2 text-2xl font-semibold text-ink">This page could not be loaded</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
          Your saved choices are still available. Try loading the page again, or return home and continue from there.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            className="focus-ring inline-flex min-h-11 items-center gap-2 rounded bg-action px-4 text-sm font-semibold text-white"
            type="button"
            onClick={reset}
          >
            <RotateCcw aria-hidden="true" size={17} /> Try again
          </button>
          <Link className="focus-ring inline-flex min-h-11 items-center rounded border border-line px-4 text-sm font-semibold text-ink" href="/">
            Return home
          </Link>
          <a className="focus-ring inline-flex min-h-11 items-center gap-2 rounded border border-line px-4 text-sm font-semibold text-ink" href={`mailto:${SUPPORT_EMAIL}?subject=Admission%20Compass%20page%20problem`}>
            <Mail aria-hidden="true" size={17} /> Contact support
          </a>
        </div>
      </section>
    </main>
  );
}
