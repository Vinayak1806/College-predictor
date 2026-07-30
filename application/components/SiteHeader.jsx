"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, GraduationCap, Menu, Search, X } from "lucide-react";
import { useState } from "react";

const links = [
  ["Home", "/"],
  ["FE Predictor", "/fe-predictor"],
  ["DSE Predictor", "/dse-predictor"],
  ["Explore Colleges", "/colleges"],
  ["Cutoffs", "/cutoffs"],
  ["College Index", "/college-index"],
  ["Compare", "/compare"],
  ["CAP List", "/preference-list"]
];

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white/95 shadow-[0_1px_10px_rgba(15,45,58,0.04)] backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4">
        <Link href="/" className="focus-ring flex min-w-0 items-center gap-3 rounded" onClick={() => setMenuOpen(false)}>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-action text-white">
            <GraduationCap aria-hidden="true" size={22} strokeWidth={2.2} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-base font-bold leading-5 text-ink">CAP Predictor</span>
            <span className="hidden text-xs text-slate-500 sm:block">Maharashtra engineering admissions</span>
          </span>
        </Link>

        <nav className="hidden shrink-0 items-center gap-0.5 xl:flex" aria-label="Main navigation">
          {links.map(([label, href]) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`focus-ring whitespace-nowrap rounded px-3 py-2 text-sm font-medium transition-colors ${
                  active ? "bg-cyan-50 text-action" : "text-slate-600 hover:bg-panel hover:text-ink"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/colleges"
            aria-label="Search colleges"
            title="Search colleges"
            className="focus-ring hidden h-11 w-11 items-center justify-center rounded border border-line text-slate-600 hover:bg-panel sm:flex xl:hidden"
          >
            <Search aria-hidden="true" size={19} />
          </Link>
          <Link
            className="focus-ring hidden min-h-11 items-center gap-2 rounded bg-action px-4 text-sm font-semibold text-white hover:bg-[#11566d] sm:inline-flex"
            href={pathname.startsWith("/dse-predictor") ? "/dse-predictor" : "/fe-predictor"}
          >
            <BarChart3 aria-hidden="true" size={17} />
            Predict
          </Link>
          <button
            type="button"
            className="focus-ring flex h-11 w-11 items-center justify-center rounded border border-line text-slate-700 xl:hidden"
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((current) => !current)}
          >
            {menuOpen ? <X aria-hidden="true" size={21} /> : <Menu aria-hidden="true" size={21} />}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <nav className="border-t border-line bg-white px-4 py-3 xl:hidden" aria-label="Mobile navigation">
          <div className="mx-auto grid max-w-7xl sm:grid-cols-2">
            {links.map(([label, href]) => {
              const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`focus-ring flex min-h-11 items-center rounded px-3 text-sm font-medium ${active ? "bg-cyan-50 text-action" : "text-slate-700"}`}
                  onClick={() => setMenuOpen(false)}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </nav>
      ) : null}
    </header>
  );
}
