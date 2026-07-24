import { SiteHeader } from "../../components/SiteHeader";
import { CollegeAutocomplete } from "../../components/CollegeAutocomplete";

export default function CutoffExplorerPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-2xl font-semibold">Cutoff Explorer</h1>
        <div className="mt-6 grid gap-3 rounded-lg border border-line bg-white p-4 md:grid-cols-4">
          {["College", "Branch", "Year", "CAP round", "Admission route", "Category", "Seat type", "City"].map((label) => (
            label === "College" ? (
              <CollegeAutocomplete key={label} className="focus-within:ring-2 focus-within:ring-[#7db9ca] rounded border border-line px-3" placeholder="College name" selectionMode="fill" showIcon={false} />
            ) : (
              <input key={label} className="focus-ring min-h-11 min-w-0 rounded border border-line px-3 text-sm" placeholder={label} />
            )
          ))}
        </div>
        <div className="mt-6 rounded-lg border border-line bg-white p-4 text-sm text-slate-600">
          Results are loaded page-by-page from `/api/cutoffs`; the browser never downloads the full CSV.
        </div>
      </main>
    </>
  );
}
