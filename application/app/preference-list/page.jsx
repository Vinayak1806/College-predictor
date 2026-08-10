import { SiteHeader } from "../../components/SiteHeader";
import { PreferenceListBuilder } from "../../components/PreferenceListBuilder";

export const metadata = {
  title: "Maharashtra CAP Preference List Builder",
  description: "Arrange saved Maharashtra engineering college and branch choices into an admission preference list.",
  robots: { index: false, follow: false }
};

export default function PreferenceListPage() {
  return (
    <>
      <SiteHeader />
      <main className="page-shell mx-auto max-w-7xl px-4 py-5 sm:px-5 md:py-7 lg:px-6">
        <div className="grid gap-2 border-l-4 border-action pl-4 md:grid-cols-[340px_minmax(0,1fr)] md:items-end md:gap-8">
          <div>
            <p className="text-xs font-semibold uppercase text-action">CAP decision workspace</p>
            <h1 className="mt-1 text-2xl font-semibold text-ink">CAP Preference List Builder</h1>
          </div>
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            Arrange college-branch choices in the exact order you want Maharashtra CAP to consider them. Basic editing works on this device; sign in for order checks, account save and PDF export.
          </p>
        </div>
        <div className="mt-4">
          <PreferenceListBuilder />
        </div>
      </main>
    </>
  );
}
