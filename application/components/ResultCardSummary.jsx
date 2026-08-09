import Link from "next/link";
import { AlertTriangle, Building2, Info, MapPin } from "lucide-react";
import { formatResultNumber, hasResultValue, zoneClass, zoneText } from "./resultCardUtils";

function Metric({ label, value, tone = "normal", note }) {
  const toneClass = {
    normal: "text-ink",
    good: "text-success",
    warning: "text-warning",
    danger: "text-danger"
  };

  return (
    <div className="min-w-0 px-4 py-3.5">
      <dt className="text-xs font-medium uppercase text-slate-500">{label}</dt>
      <dd className={`mt-1 break-words text-lg font-semibold ${toneClass[tone]}`}>{value}</dd>
      {note ? <p className="mt-1 text-xs leading-5 text-slate-500">{note}</p> : null}
    </div>
  );
}

export function ResultCardSummary({
  result,
  collegeHref,
  officialCutoff,
  selectedCutoffDifference,
  selectedDifferenceText,
  marginTone,
  zoneNeedsExplanation,
  seatTypeInfo,
  eligibilityText,
  allocationText,
  confidenceText,
  comparisonText
}) {
  return (
    <>
      <header className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start md:p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold uppercase text-slate-500">
            <span>Institute {result.instituteCode}</span>
            {hasResultValue(result.strengthIndex) ? <span>Demand index {result.strengthIndex}/100</span> : null}
          </div>
          <h3 className="mt-2 max-w-3xl text-lg font-semibold leading-6 text-ink">
            {collegeHref ? <Link className="hover:text-action hover:underline" href={collegeHref}>{result.college}</Link> : result.college}
          </h3>
          <p className="mt-2 font-semibold text-action">{result.branch}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            {result.city ? <span className="inline-flex items-center gap-1"><MapPin aria-hidden="true" size={14} />{result.city}</span> : null}
            {result.university ? <span className="inline-flex items-center gap-1"><Building2 aria-hidden="true" size={14} />{result.university}</span> : null}
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 sm:grid sm:justify-items-end">
          <span className={`rounded border px-3 py-1.5 text-xs font-semibold ${zoneClass[result.zone] || "border-line"}`}>
            {zoneText[result.zone] || result.zone}
          </span>
          <div className="text-right">
            <p className={`text-xl font-semibold ${selectedCutoffDifference >= 0 ? "text-success" : selectedCutoffDifference >= -4 ? "text-warning" : "text-danger"}`}>
              {selectedDifferenceText}
            </p>
            <p className="text-xs text-slate-500">selected cutoff difference</p>
          </div>
        </div>
      </header>

      <section className="border-y border-line bg-panel px-4 py-4 md:px-5">
        <p className="text-xs font-medium uppercase text-slate-500">Admission match</p>
        <p className="mt-1 text-sm font-semibold text-ink">{comparisonText}</p>
        <dl className="mt-3 grid overflow-hidden rounded border border-line divide-y divide-line bg-white sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <Metric label={`Your ${result.scoreLabel || "percentile"}`} value={formatResultNumber(result.studentScore)} />
          <Metric label="Selected official cutoff" value={formatResultNumber(officialCutoff)} note={`${result.year}, CAP Round ${result.round}`} />
          <Metric label="Difference from selected cutoff" value={selectedDifferenceText} tone={marginTone} note="Positive means your score is above this cutoff" />
        </dl>
        {zoneNeedsExplanation ? (
          <div className="mt-3 flex items-start gap-2 border-l-2 border-action bg-cyan-50 px-3 py-2 text-xs leading-5 text-slate-700">
            <Info aria-hidden="true" className="mt-0.5 shrink-0 text-action" size={15} />
            <p>The admission status also considers multiple years and data confidence. Open the explanation below to see the calculation.</p>
          </div>
        ) : null}
      </section>

      <section className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center md:px-5">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase text-slate-500">Official seat used</p>
          <p className="mt-1 font-semibold text-ink">{seatTypeInfo.code} - {seatTypeInfo.title}</p>
          <p className="mt-1 text-sm text-slate-600">
            {[`${result.year}, CAP Round ${result.round}`, eligibilityText, allocationText].filter(Boolean).join(" | ")}
          </p>
        </div>
        <p className="text-xs text-slate-500 sm:text-right">{confidenceText}</p>
      </section>

      {result.confidenceWarning ? (
        <div className="flex items-start gap-2 border-t border-warning bg-amber-50 px-4 py-3 text-sm text-slate-700 md:px-5">
          <AlertTriangle aria-hidden="true" className="mt-0.5 shrink-0 text-warning" size={17} />
          <p>{result.confidenceWarning}</p>
        </div>
      ) : null}
    </>
  );
}
