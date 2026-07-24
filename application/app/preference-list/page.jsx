import { SiteHeader } from "../../components/SiteHeader";
import { CollegeAutocomplete } from "../../components/CollegeAutocomplete";

export default function PreferenceListPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-semibold">CAP Preference-List Builder</h1>
        <div className="mt-6 rounded-lg border border-line bg-white p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <CollegeAutocomplete className="focus-within:ring-2 focus-within:ring-[#7db9ca] min-w-0 flex-1 rounded border border-line px-3" placeholder="Add a college" selectionMode="fill" showIcon={false} />
            <button className="focus-ring min-h-11 rounded bg-action px-4 font-semibold text-white">Add</button>
          </div>
          <div className="mt-4 grid gap-2 text-sm">
            {["Ambitious", "Target", "Safe", "Backup"].map((zone) => (
              <div key={zone} className="rounded border border-line p-3">{zone} choices</div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
