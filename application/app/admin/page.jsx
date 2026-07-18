import { SiteHeader } from "../../components/SiteHeader";

export default function AdminPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {["Upload PDF", "Run extraction", "Preview records", "Validation errors", "Approve dataset", "Import history", "Publish/unpublish", "Rollback"].map((label) => (
            <button key={label} className="focus-ring min-h-11 rounded-lg border border-line bg-white p-4 text-left text-sm font-medium">
              {label}
            </button>
          ))}
        </div>
      </main>
    </>
  );
}

