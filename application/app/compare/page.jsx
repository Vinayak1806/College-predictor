import { SiteHeader } from "../../components/SiteHeader";
import { CollegeAutocomplete } from "../../components/CollegeAutocomplete";

export default function ComparePage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-2xl font-semibold">College Comparison</h1>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <section key={item} className="rounded-lg border border-line bg-white p-4">
              <h2 className="font-semibold">College {item}</h2>
              <CollegeAutocomplete className="focus-within:ring-2 focus-within:ring-[#7db9ca] mt-3 rounded border border-line px-3" placeholder="Search college" selectionMode="fill" showIcon={false} />
              <dl className="mt-4 grid gap-2 text-sm text-slate-600">
                <div>Admission chance</div>
                <div>Cutoffs</div>
                <div>Location</div>
                <div>College type</div>
              </dl>
            </section>
          ))}
        </div>
      </main>
    </>
  );
}
