import { ResultCard } from "../../components/ResultCard";
import { SiteHeader } from "../../components/SiteHeader";

const sample = {
  college: "ABC College of Engineering",
  branch: "Computer Engineering",
  city: "Pune",
  zone: "TARGET",
  studentScore: 89.2,
  closingCutoff: 88.5,
  margin: 0.7,
  year: "2025-26",
  round: 3,
  seatType: "GOBCH",
  reason: "Your score is 0.70 above the previous closing cutoff."
};

export default function ResultsPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto grid max-w-7xl gap-4 px-4 py-8 md:grid-cols-[280px_1fr]">
        <aside className="rounded-lg border border-line bg-white p-4">
          <h1 className="font-semibold">Filters</h1>
          <p className="mt-2 text-sm text-slate-600">Desktop filters stay here; mobile filters should open in a drawer.</p>
        </aside>
        <section className="grid gap-4">
          <ResultCard {...sample} />
        </section>
      </main>
    </>
  );
}

