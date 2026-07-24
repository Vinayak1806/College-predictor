import { SiteHeader } from "../../components/SiteHeader";
import { DataQualityDashboard } from "../../components/DataQualityDashboard";
import { PredictionHealthDashboard } from "../../components/PredictionHealthDashboard";

export default function AdminPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="max-w-3xl border-l-4 border-action pl-4">
          <p className="text-xs font-semibold uppercase text-action">Administration</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">Data Quality Centre</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Find records that can mislead predictions, then separate required corrections from optional college-research coverage.
          </p>
        </div>
        <div className="mt-5 grid gap-5">
          <PredictionHealthDashboard />
          <DataQualityDashboard />
        </div>
      </main>
    </>
  );
}
