import Link from "next/link";
import { Database, ExternalLink, GraduationCap } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-[#102a43] text-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-[1.3fr_0.7fr_0.7fr]">
        <div className="max-w-md">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded bg-white/10"><GraduationCap aria-hidden="true" size={22} /></span>
            <p className="font-semibold">CAP Predictor</p>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-300">
            A student decision tool built from structured Maharashtra CAP cutoff records. Historical matches support research but do not guarantee admission.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold">Student tools</p>
          <div className="mt-3 grid gap-2 text-sm text-slate-300">
            <Link className="hover:text-white" href="/fe-predictor">FE Predictor</Link>
            <Link className="hover:text-white" href="/colleges">Explore colleges</Link>
            <Link className="hover:text-white" href="/college-index">Historical demand index</Link>
            <Link className="hover:text-white" href="/preference-list">CAP preference list</Link>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold">Data and trust</p>
          <div className="mt-3 grid gap-2 text-sm text-slate-300">
            <span className="flex items-center gap-2"><Database aria-hidden="true" size={15} /> PostgreSQL records</span>
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
