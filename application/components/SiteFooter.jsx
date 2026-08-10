import Link from "next/link";
import { Database, ExternalLink } from "lucide-react";
import { AnalyticsSettingsButton } from "./AnalyticsSettingsButton";
import { BrandMark } from "./BrandMark";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-cyan-900 bg-[#102737] text-white">
      <div className="h-1 bg-gradient-to-r from-action via-indigo-500 to-cyan-400" />
      <div className="mx-auto grid max-w-7xl gap-9 px-4 py-10 sm:px-5 md:grid-cols-[1.25fr_0.75fr_0.75fr] md:py-12 lg:px-6">
        <div className="max-w-md">
          <div className="flex items-center gap-3">
            <BrandMark />
            <div>
              <p className="font-semibold tracking-normal">Admission Compass</p>
              <p className="mt-0.5 text-xs text-slate-400">Maharashtra engineering college predictor</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-300">
            A student decision tool built from structured Maharashtra CAP cutoff records. Historical matches support research but do not guarantee admission.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold">Student tools</p>
          <div className="mt-3 grid gap-2.5 text-sm text-slate-300">
            <Link className="transition-colors hover:text-white" href="/fe-predictor">First-Year B.E./B.Tech Predictor</Link>
            <Link className="transition-colors hover:text-white" href="/dse-predictor">Direct Second-Year (DSE) Predictor</Link>
            <Link className="transition-colors hover:text-white" href="/colleges">Explore Engineering Colleges</Link>
            <Link className="transition-colors hover:text-white" href="/college-index">Top Maharashtra Engineering Colleges</Link>
            <Link className="transition-colors hover:text-white" href="/preference-list">CAP Preference List</Link>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold">Data and trust</p>
          <div className="mt-3 grid gap-2.5 text-sm text-slate-300">
            <span className="flex items-center gap-2"><Database aria-hidden="true" size={15} /> PostgreSQL records</span>
            <Link className="hover:text-white" href="/disclaimer">Admission disclaimer</Link>
            <Link className="hover:text-white" href="/privacy">Privacy policy</Link>
            <Link className="hover:text-white" href="/terms">Terms of use</Link>
            <AnalyticsSettingsButton />
            <a className="flex items-center gap-2 hover:text-white" href="https://cetcell.mahacet.org/" target="_blank" rel="noreferrer">
              Maharashtra CET Cell <ExternalLink aria-hidden="true" size={14} />
            </a>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-4 text-xs leading-5 text-slate-400">
          Not an official government platform. Always verify final cutoffs, schedules and admission rules with the Maharashtra CET Cell.
        </div>
      </div>
    </footer>
  );
}
