"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, CircleUserRound, LogOut, Menu, Search, UserRound, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { authClient } from "../lib/authClient";
import { BrandMark } from "./BrandMark";

const links = [
  ["Home", "/"],
  ["First Year", "/fe-predictor"],
  ["Direct Second Year", "/dse-predictor"],
  ["Colleges", "/colleges"],
  ["Cutoffs", "/cutoffs"],
  ["Top Colleges", "/college-index"],
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
    setMenuOpen(false);
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
      if (event.key === "Escape") {
        setAccountOpen(false);
        setMenuOpen(false);
      }
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
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200/60 bg-white/80 backdrop-blur-md shadow-xs">
        <div className="h-[3px] bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500" />
        <div className="mx-auto flex min-h-[64px] max-w-7xl items-center justify-between gap-3 px-3 sm:px-5 lg:px-6">
          <Link href="/" className="focus-ring group flex min-w-0 items-center gap-3 rounded-lg" onClick={() => setMenuOpen(false)}>
            <BrandMark className="h-10 w-10 transition-transform duration-200 group-hover:scale-[1.04]" />
            <span className="min-w-0">
              <span className="block truncate text-base font-bold leading-5 tracking-tight text-slate-900">Admission Compass</span>
              <span className="hidden text-[11px] font-medium text-slate-500 sm:block">Maharashtra engineering college predictor</span>
            </span>
          </Link>

          <nav className="hidden shrink-0 items-center gap-1.5 xl:flex bg-slate-100/50 p-1 rounded-full border border-slate-200/60 shadow-3xs" aria-label="Main navigation">
            {links.map(([label, href]) => {
              const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`focus-ring whitespace-nowrap rounded-full px-4 py-1.5 text-[13.5px] font-medium transition-all duration-300 hover:scale-[1.02] active:scale-98 ${
                    active
                      ? "bg-white text-indigo-600 font-semibold shadow-xs border border-slate-200/40"
                      : "text-slate-600 hover:text-indigo-600"
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
                  className="focus-ring flex h-10 w-10 items-center justify-center rounded-full border border-transparent text-slate-600 transition-all duration-200 hover:border-slate-200 hover:bg-slate-100 hover:text-indigo-600 hover:scale-105 active:scale-95"
                  onClick={() => {
                    setMenuOpen(false);
                    setAccountOpen((current) => !current);
                  }}
                >
                  {user.image && !imageFailed ? (
                    <span className="h-8 w-8 overflow-hidden rounded-full border border-slate-200 bg-white ring-2 ring-white">
                      <img
                        src={user.image}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                        onError={() => setImageFailed(true)}
                      />
                    </span>
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                      <UserRound aria-hidden="true" size={17} />
                    </span>
                  )}
                </button>
              ) : (
                <Link
                  href="/login"
                  aria-label="Student login"
                  title={isPending ? "Checking account" : "Student login"}
                  className="focus-ring flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-2xs transition-all duration-200 hover:border-indigo-200 hover:bg-indigo-50/50 hover:text-indigo-600 hover:scale-105 active:scale-95"
                >
                  <CircleUserRound aria-hidden="true" size={19} />
                </Link>
              )}

              {user && accountOpen ? (
                <div className="menu-enter absolute right-0 top-[calc(100%+0.5rem)] w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg" role="menu">
                  <div className="border-b border-slate-100 px-4 py-3">
                    <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">{user.email}</p>
                  </div>
                  <div className="p-1.5">
                    <Link
                      href="/account"
                      role="menuitem"
                      className="focus-ring flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
                    >
                      <UserRound aria-hidden="true" size={17} />
                      My account
                    </Link>
                    <button
                      type="button"
                      role="menuitem"
                      disabled={signingOut}
                      onClick={signOut}
                      className="focus-ring flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-60"
                    >
                      <LogOut aria-hidden="true" size={17} />
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
              className="focus-ring hidden h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-2xs transition-all duration-200 hover:border-indigo-200 hover:bg-indigo-50/50 hover:text-indigo-600 hover:scale-105 active:scale-95 sm:flex xl:hidden"
            >
              <Search aria-hidden="true" size={18} />
            </Link>
            <button
              type="button"
              className="focus-ring flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-2xs transition-all duration-200 hover:border-indigo-200 hover:bg-indigo-50/50 hover:scale-105 active:scale-95 xl:hidden"
              aria-label={menuOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={menuOpen}
              onClick={() => {
                setAccountOpen(false);
                setMenuOpen((current) => !current);
              }}
            >
              {menuOpen ? <X aria-hidden="true" size={20} /> : <Menu aria-hidden="true" size={20} />}
            </button>
          </div>
        </div>
      </header>

      {menuOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-xs xl:hidden pt-[67px] p-3 sm:p-4">
          <button className="absolute inset-0 cursor-default" type="button" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />
          <nav className="fade-in-scale relative flex h-auto max-h-[calc(100dvh-85px)] w-full max-w-xs sm:max-w-sm flex-col overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xl" aria-label="Mobile navigation">
            <div className="mb-4 border-b border-slate-100 pb-3">
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Student navigation</p>
              <p className="mt-1 text-xs text-slate-500">Predict, research and prepare your CAP list.</p>
            </div>
            <div className="grid gap-1">
            {links.map(([label, href]) => {
              const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`focus-ring flex min-h-11 items-center rounded-xl px-3.5 text-sm font-medium transition-all duration-200 hover:translate-x-1 ${
                    active
                      ? "bg-indigo-50/80 font-semibold text-indigo-700 border border-indigo-100/50 shadow-3xs"
                      : "text-slate-700 hover:bg-slate-100/80 hover:text-indigo-600"
                  }`}
                  onClick={() => setMenuOpen(false)}
                >
                  {label}
                </Link>
              );
            })}
            </div>
            <Link
              href={pathname.startsWith("/dse-predictor") ? "/dse-predictor" : "/fe-predictor"}
              className="btn-primary mt-4 flex w-full justify-center rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-98"
              onClick={() => setMenuOpen(false)}
            >
              <BarChart3 aria-hidden="true" size={17} /> Predict colleges
            </Link>
          </nav>
        </div>
      ) : null}
    </>
  );
}
