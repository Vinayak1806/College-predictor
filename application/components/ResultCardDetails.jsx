import { formatResultNumber } from "./resultCardUtils";

function DetailFact({ label, value }) {
  return (
    <div className="min-w-0 py-2">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-0.5 break-words text-sm font-semibold text-ink">{value}</dd>
    </div>
  );
}

export function ResultCardDetails({ result, detailFacts, otherSeatTypes }) {
  return (
    <details className="border-t border-line text-sm">
      <summary className="focus-ring cursor-pointer px-4 py-4 font-semibold text-action md:px-5">
        Why this result, college strength and cutoff history
      </summary>
      <div className="border-t border-line px-4 py-4 md:px-5">
        <p className="max-w-3xl leading-6 text-slate-600">{result.reason}</p>

        {result.zoneExplanation ? (
          <div className="mt-3 border-l-2 border-action pl-3">
            <p className="text-xs font-semibold uppercase text-action">How the admission status was calculated</p>
            <p className="mt-1 max-w-3xl leading-6 text-slate-600">{result.zoneExplanation}</p>
          </div>
        ) : null}

        {detailFacts.length ? (
          <dl className="mt-3 grid grid-cols-2 gap-x-5 border-y border-line sm:grid-cols-3 xl:grid-cols-4">
            {detailFacts.map(([label, value]) => <DetailFact key={label} label={label} value={value} />)}
          </dl>
        ) : null}

        {result.cutoffHistory?.length ? (
          <div className="mt-4">
            <p className="text-xs font-medium uppercase text-slate-500">Comparable cutoff records</p>
            <div className="mt-2 divide-y divide-line border-y border-line">
              {result.cutoffHistory.map((item) => (
                <div key={`${item.year}-${item.round}`} className="grid grid-cols-[1fr_auto] gap-3 py-3 sm:grid-cols-[120px_100px_1fr_90px]">
                  <p className="font-medium text-ink">{item.year}</p>
                  <p className="text-slate-600">Round {item.round}</p>
                  <p className="text-slate-600">{item.seatType}</p>
                  <p className="text-right font-semibold text-ink">{formatResultNumber(item.cutoff)}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {otherSeatTypes.length ? (
          <p className="mt-3 text-slate-600"><span className="font-medium text-ink">Other eligible seats:</span> {otherSeatTypes.join(", ")}</p>
        ) : null}
        <p className="mt-3 text-xs leading-5 text-slate-500">
          Historical demand is a research signal based mainly on previous {result.admissionRoute || "FE"} cutoffs. It is not an official Maharashtra college rank.
        </p>
        {result.sourceUrl ? (
          <p className="mt-3 text-slate-600">
            Official source{result.sourcePage ? `, PDF page ${result.sourcePage}` : ""}:{" "}
            <a className="font-medium text-action underline" href={result.sourceUrl} target="_blank" rel="noreferrer">View cutoff record</a>
          </p>
        ) : result.sourceFilename ? (
          <p className="mt-3 text-slate-600">
            <span className="font-medium text-ink">Official source:</span> {result.sourceFilename}
            {result.sourcePage ? `, PDF page ${result.sourcePage}` : ""}
          </p>
        ) : null}
      </div>
    </details>
  );
}
