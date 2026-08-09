"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, CircleUserRound, GraduationCap, LogOut, Menu, Search, UserRound, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { authClient } from "../lib/authClient";

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

export function SiteHeader({ showStudentAccount = true }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const accountMenuRef = useRef(null);
  const user = session?.user;

  useEffect(() => {
    setAccountOpen(false);
  }, [pathname]);

  useEffect(() => {
    setImageFailed(false);
  }, [user?.image]);

  useEffect(() => {
    function closeAccountMenu(event) {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target)) {
        setAccountOpen(false);
      }
    }

    function closeOnEscape(event) {
      if (event.key === "Escape") setAccountOpen(false);
    }

    document.addEventListener("pointerdown", closeAccountMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeAccountMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  async function signOut() {
    setSigningOut(true);
    await authClient.signOut();
    setAccountOpen(false);
    setSigningOut(false);
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white/95 shadow-[0_4px_18px_rgba(18,52,69,0.06)] backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4">
        <Link href="/" className="focus-ring group flex min-w-0 items-center gap-3 rounded" onClick={() => setMenuOpen(false)}>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-action text-white shadow-sm transition-colors group-hover:bg-[#0a596d]">
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
                className={`focus-ring whitespace-nowrap rounded border-b-2 px-3 py-2 text-sm font-medium ${
                  active ? "border-action bg-cyan-50 text-action" : "border-transparent text-slate-600 hover:bg-panel hover:text-ink"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {showStudentAccount ? <div className="relative" ref={accountMenuRef}>
            {user ? (
              <button
                type="button"
                aria-label={`Open account menu for ${user.name}`}
                aria-expanded={accountOpen}
                title={user.name}
                className="focus-ring flex h-11 w-11 items-center justify-center rounded-full text-slate-600 hover:bg-panel hover:text-action"
                onClick={() => {
                  setMenuOpen(false);
                  setAccountOpen((current) => !current);
                }}
              >
                {user.image && !imageFailed ? (
                  <span className="h-8 w-8 overflow-hidden rounded-full border border-line bg-white">
                    <img
                      src={user.image}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                      onError={() => setImageFailed(true)}
                    />
                  </span>
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-white">
                    <UserRound aria-hidden="true" size={18} />
                  </span>
                )}
              </button>
            ) : (
              <Link
                href="/login"
                aria-label="Student login"
                title={isPending ? "Checking account" : "Student login"}
                className="focus-ring flex h-11 w-11 items-center justify-center rounded border border-line bg-white text-slate-600 shadow-sm hover:border-[#aac0ca] hover:bg-panel hover:text-action"
              >
                <CircleUserRound aria-hidden="true" size={20} />
              </Link>
            )}

            {user && accountOpen ? (
              <div className="menu-enter absolute right-0 top-[calc(100%+0.5rem)] w-72 overflow-hidden rounded border border-line bg-white shadow-raised" role="menu">
                <div className="border-b border-line px-4 py-3">
                  <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">{user.email}</p>
                </div>
                <div className="p-2">
                  <Link
                    href="/account"
                    role="menuitem"
                    className="focus-ring flex min-h-11 items-center gap-3 rounded px-3 text-sm font-medium text-slate-700 hover:bg-panel"
                  >
                    <UserRound aria-hidden="true" size={18} />
                    My account
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={signingOut}
                    onClick={signOut}
                    className="focus-ring flex min-h-11 w-full items-center gap-3 rounded px-3 text-left text-sm font-medium text-slate-700 hover:bg-panel disabled:opacity-60"
                  >
                    <LogOut aria-hidden="true" size={18} />
                    {signingOut ? "Signing out..." : "Sign out"}
                  </button>
                </div>
              </div>
            ) : null}
          </div> : null}
          <Link
            href="/colleges"
            aria-label="Search colleges"
            title="Search colleges"
            className="focus-ring hidden h-11 w-11 items-center justify-center rounded border border-line bg-white text-slate-600 shadow-sm hover:border-[#aac0ca] hover:bg-panel hover:text-action sm:flex xl:hidden"
          >
            <Search aria-hidden="true" size={19} />
          </Link>
          <Link
            className="focus-ring hidden min-h-11 items-center gap-2 rounded bg-action px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#0a596d] hover:shadow-soft sm:inline-flex"
            href={pathname.startsWith("/dse-predictor") ? "/dse-predictor" : "/fe-predictor"}
          >
            <BarChart3 aria-hidden="true" size={17} />
            Predict
          </Link>
          <button
            type="button"
            className="focus-ring flex h-11 w-11 items-center justify-center rounded border border-line bg-white text-slate-700 shadow-sm hover:border-[#aac0ca] hover:bg-panel xl:hidden"
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={menuOpen}
            onClick={() => {
              setAccountOpen(false);
              setMenuOpen((current) => !current);
            }}
          >
            {menuOpen ? <X aria-hidden="true" size={21} /> : <Menu aria-hidden="true" size={21} />}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <nav className="menu-enter border-t border-line bg-white px-4 py-3 shadow-soft xl:hidden" aria-label="Mobile navigation">
          <div className="mx-auto grid max-w-7xl sm:grid-cols-2">
            {links.map(([label, href]) => {
              const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`focus-ring flex min-h-11 items-center rounded border-l-2 px-3 text-sm font-medium ${active ? "border-action bg-cyan-50 text-action" : "border-transparent text-slate-700 hover:bg-panel"}`}
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
