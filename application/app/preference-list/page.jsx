import { SiteHeader } from "../../components/SiteHeader";
import { PreferenceListBuilder } from "../../components/PreferenceListBuilder";

export const metadata = {
  title: "CAP Preference-List Builder",
  description: "Arrange saved Maharashtra engineering college and branch choices into an admission preference list.",
  robots: { index: false, follow: false }
};

export default function PreferenceListPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="max-w-3xl border-l-4 border-action pl-4">
          <p className="text-xs font-semibold uppercase text-action">CAP decision workspace</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">Preference-List Builder</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Arrange college-branch choices in the exact order you want Maharashtra CAP to consider them. Your list is saved on this device without login.
          </p>
        </div>
        <div className="mt-5">
          <PreferenceListBuilder />
        </div>
      </main>
    </>
  );
}
