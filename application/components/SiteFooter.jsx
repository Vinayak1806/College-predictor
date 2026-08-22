import Link from "next/link";
import { ChevronRight, Database, ExternalLink, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { AnalyticsSettingsButton } from "./AnalyticsSettingsButton";
import { BrandMark } from "./BrandMark";
import { SUPPORT_EMAIL } from "../lib/site";

export function SiteFooter() {
  return (
    <footer className="relative mt-16 overflow-hidden border-t border-slate-800/80 bg-[#08121c] text-slate-300">
      {/* Top Gradient Border */}
      <div className="h-1 w-full bg-gradient-to-r from-cyan-500 via-indigo-500 via-purple-500 to-emerald-400" />

      {/* Decorative Ambient Background Glows */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-cyan-500/5 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-indigo-500/5 blur-3xl" />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          {/* Column 1: Brand & Mission (4 cols) */}
          <div className="sm:col-span-2 lg:col-span-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 border border-slate-700/60 p-2 shadow-inner">
                <BrandMark className="h-7 w-7" />
              </div>
              <div>
                <p className="text-base font-bold tracking-tight text-white">Admission Compass</p>
                <p className="text-xs font-medium text-cyan-400/90">Maharashtra Engineering College Predictor</p>
              </div>
            </div>

            <p className="mt-4 max-w-sm text-xs leading-relaxed text-slate-400">
              An intelligent student decision system built on official Maharashtra CAP cutoff records, seat matrix statistics, and historical rank algorithms.
            </p>

            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-medium text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400"></span>
              </span>
              Official CAP Cutoff Dataset 2026–27
            </div>
          </div>

          {/* Column 2: Student Tools (3 cols) */}
          <div className="lg:col-span-3">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white">
              <Sparkles className="text-cyan-400" size={14} /> Student Tools
            </p>
            <ul className="mt-4 space-y-2.5 text-xs text-slate-400">
              <li>
                <Link className="group inline-flex items-center gap-1.5 transition-colors duration-200 hover:text-white" href="/fe-predictor">
                  <ChevronRight className="text-slate-500 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-white" size={13} />
                  First-Year B.E./B.Tech Predictor
                </Link>
              </li>
              <li>
                <Link className="group inline-flex items-center gap-1.5 transition-colors duration-200 hover:text-white" href="/dse-predictor">
                  <ChevronRight className="text-slate-500 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-white" size={13} />
                  Direct Second-Year (DSE) Predictor
                </Link>
              </li>
              <li>
                <Link className="group inline-flex items-center gap-1.5 transition-colors duration-200 hover:text-white" href="/preference-list">
                  <ChevronRight className="text-slate-500 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-white" size={13} />
                  CAP Preference List Builder
                </Link>
              </li>
              <li>
                <Link className="group inline-flex items-center gap-1.5 transition-colors duration-200 hover:text-white" href="/compare">
                  <ChevronRight className="text-slate-500 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-white" size={13} />
                  Compare Colleges & Branches
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Exploration (2 cols) */}
          <div className="lg:col-span-2">
            <p className="text-xs font-bold uppercase tracking-wider text-white">Explore</p>
            <ul className="mt-4 space-y-2.5 text-xs text-slate-400">
              <li>
                <Link className="group inline-flex items-center gap-1.5 transition-colors duration-200 hover:text-white" href="/colleges">
                  Explore Colleges
                </Link>
              </li>
              <li>
                <Link className="group inline-flex items-center gap-1.5 transition-colors duration-200 hover:text-white" href="/college-index">
                  Top Colleges Index
                </Link>
              </li>
              <li>
                <Link className="group inline-flex items-center gap-1.5 transition-colors duration-200 hover:text-white" href="/cutoffs">
                  Cutoff Search
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Data, Trust & Support (3 cols) */}
          <div className="lg:col-span-3">
            <p className="text-xs font-bold uppercase tracking-wider text-white">Data & Trust</p>
            <ul className="mt-4 space-y-2.5 text-xs text-slate-400">
              <li className="flex items-center gap-2 text-slate-300 font-medium">
                <Database aria-hidden="true" className="text-cyan-400" size={14} /> PostgreSQL Verified Database
              </li>
              <li>
                <Link className="transition-colors duration-200 hover:text-white" href="/disclaimer">
                  Admission Disclaimer
                </Link>
              </li>
              <li>
                <Link className="transition-colors duration-200 hover:text-white" href="/privacy">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link className="transition-colors duration-200 hover:text-white" href="/terms">
                  Terms of Use
                </Link>
              </li>
              <li>
                <a className="inline-flex items-center gap-1.5 transition-colors duration-200 hover:text-white" href={`mailto:${SUPPORT_EMAIL}?subject=Admission%20Compass%20support`}>
                  <Mail aria-hidden="true" className="text-slate-500" size={13} /> Contact Support
                </a>
              </li>
              <li className="transition-colors duration-200 hover:text-white">
                <AnalyticsSettingsButton />
              </li>
              <li className="pt-1">
                <a
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-slate-700 hover:bg-slate-900 hover:text-white"
                  href="https://cetcell.mahacet.org/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Maharashtra CET Cell <ExternalLink aria-hidden="true" size={13} />
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Disclaimer & Copyright Bar */}
      <div className="border-t border-slate-800/80 bg-[#050c14] py-4">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 text-[11px] text-slate-500 sm:flex-row sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} Admission Compass. All rights reserved.</p>
          <p className="text-center sm:text-right">
            Not an official government platform. Always verify final cutoffs, schedules and admission rules with the Maharashtra CET Cell.
          </p>
        </div>
      </div>
    </footer>
  );
}
