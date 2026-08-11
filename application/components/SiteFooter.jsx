import Link from "next/link";
import { Database, ExternalLink, Mail } from "lucide-react";
import { AnalyticsSettingsButton } from "./AnalyticsSettingsButton";
import { BrandMark } from "./BrandMark";
import { SUPPORT_EMAIL } from "../lib/site";

export function SiteFooter() {
  return (
    <footer className="mt-10 border-t border-slate-800 bg-[#0f2230] text-white">
      <div className="h-0.5 bg-gradient-to-r from-indigo-500 via-action to-cyan-400" />
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-5 md:grid-cols-[1.25fr_0.75fr_0.75fr] md:gap-10 md:py-9 lg:px-6">
        <div className="max-w-md">
          <div className="flex items-center gap-3">
            <BrandMark className="h-9 w-9" />
            <div>
              <p className="text-sm font-semibold tracking-tight">Admission Compass</p>
              <p className="mt-0.5 text-[11px] font-medium text-slate-400">Maharashtra engineering college predictor</p>
            </div>
          </div>
          <p className="mt-4 max-w-sm text-[13px] leading-5 text-slate-300">
            A student decision tool built from structured Maharashtra CAP cutoff records. Historical matches support research but do not guarantee admission.
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-300">Student tools</p>
          <div className="mt-3 grid gap-2 text-[13px] leading-5 text-slate-400">
            <Link className="transition-colors duration-200 hover:text-white" href="/fe-predictor">First-Year B.E./B.Tech Predictor</Link>
            <Link className="transition-colors duration-200 hover:text-white" href="/dse-predictor">Direct Second-Year (DSE) Predictor</Link>
            <Link className="transition-colors duration-200 hover:text-white" href="/colleges">Explore Engineering Colleges</Link>
            <Link className="transition-colors duration-200 hover:text-white" href="/college-index">Top Maharashtra Engineering Colleges</Link>
            <Link className="transition-colors duration-200 hover:text-white" href="/preference-list">CAP Preference List</Link>
          </div>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-300">Data and trust</p>
          <div className="mt-3 grid gap-2 text-[13px] leading-5 text-slate-400">
            <span className="flex items-center gap-2"><Database aria-hidden="true" size={15} /> PostgreSQL records</span>
            <Link className="transition-colors duration-200 hover:text-white" href="/disclaimer">Admission disclaimer</Link>
            <Link className="transition-colors duration-200 hover:text-white" href="/privacy">Privacy policy</Link>
            <Link className="transition-colors duration-200 hover:text-white" href="/terms">Terms of use</Link>
            <a className="flex items-center gap-2 transition-colors duration-200 hover:text-white" href={`mailto:${SUPPORT_EMAIL}?subject=Admission%20Compass%20support`}>
              <Mail aria-hidden="true" size={14} /> Contact support
            </a>
            <AnalyticsSettingsButton />
            <a className="flex items-center gap-2 transition-colors duration-200 hover:text-white" href="https://cetcell.mahacet.org/" target="_blank" rel="noreferrer">
              Maharashtra CET Cell <ExternalLink aria-hidden="true" size={14} />
            </a>
          </div>
        </div>
      </div>
      <div className="border-t border-white/8">
        <div className="mx-auto max-w-7xl px-4 py-3 text-[11px] leading-4 text-slate-500 sm:px-5 lg:px-6">
          Not an official government platform. Always verify final cutoffs, schedules and admission rules with the Maharashtra CET Cell.
        </div>
      </div>
    </footer>
  );
}
