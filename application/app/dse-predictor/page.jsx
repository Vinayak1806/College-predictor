import { SiteHeader } from "../../components/SiteHeader";

export default function DsePredictorPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-semibold">DSE Predictor</h1>
        <form className="mt-6 grid gap-4 rounded-lg border border-line bg-white p-4">
          {["Diploma percentage", "DSE merit number", "Diploma branch", "Category", "Gender", "Home university", "Preferred B.E./B.Tech branches", "Preferred cities"].map((label) => (
            <label key={label} className="grid gap-2 text-sm font-medium">
              {label}
              <input className="focus-ring min-h-11 rounded border border-line px-3" placeholder={label} />
            </label>
          ))}
          <button className="focus-ring sticky bottom-3 min-h-11 rounded bg-action px-4 font-semibold text-white">
            Predict Colleges
          </button>
        </form>
      </main>
    </>
  );
}

