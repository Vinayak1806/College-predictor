import Link from "next/link";

const links = [
  ["FE", "/fe-predictor"],
  ["DSE", "/dse-predictor"],
  ["Cutoffs", "/cutoffs"],
  ["Compare", "/compare"],
  ["CAP List", "/preference-list"],
  ["Admin", "/admin"]
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="font-semibold tracking-normal text-ink">
          CAP Predictor
        </Link>
        <nav className="hidden items-center gap-2 text-sm text-slate-700 md:flex">
          {links.map(([label, href]) => (
            <Link key={href} href={href} className="rounded px-3 py-2 hover:bg-panel">
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

