import Link from "next/link";
import { explainSeatType } from "../lib/seatTypes";

const zoneClass = {
  SAFE: "border-success bg-emerald-50 text-success",
  TARGET: "border-action bg-cyan-50 text-action",
  AMBITIOUS: "border-warning bg-amber-50 text-warning",
  HIGHLY_AMBITIOUS: "border-danger bg-red-50 text-danger"
};

const zoneBarClass = {
  SAFE: "bg-success",
  TARGET: "bg-action",
  AMBITIOUS: "bg-warning",
  HIGHLY_AMBITIOUS: "bg-danger"
};

const zoneText = {
  SAFE: "Safe",
  TARGET: "Target",
  AMBITIOUS: "Ambitious",
  HIGHLY_AMBITIOUS: "Highly Ambitious"
};

const trendText = {
  RISING: "Rising cutoff",
  STABLE: "Stable cutoff",
  FALLING: "Falling cutoff"
};

function hasValue(value) {
  return value !== null && value !== undefined && value !== "" && value !== "N/A";
}

function formatNumber(value) {
  return Number(value).toFixed(2);
}

function formatMoney(value) {
  return `Rs. ${Number(value).toLocaleString("en-IN")}`;
}

function Metric({ label, value, tone = "normal", note }) {
  const toneClass = {
    normal: "text-ink",
    good: "text-success",
    warning: "text-warning",
    danger: "text-danger"
  };

  return (
    <div className="min-w-0 px-3 py-3">
      <dt className="text-xs font-medium uppercase text-slate-500">{label}</dt>
      <dd className={`mt-1 break-words text-lg font-semibold ${toneClass[tone]}`}>{value}</dd>
      {note ? <p className="mt-1 text-xs text-slate-500">{note}</p> : null}
    </div>
  );
}

function SmallFact({ label, value }) {
  return (
    <div className="min-w-0 py-2">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-0.5 break-words text-sm font-semibold text-ink">{value}</dd>
    </div>
  );
}

export function ResultCard(props) {
  const marginText = `${props.margin >= 0 ? "+" : ""}${formatNumber(props.margin)}`;
  const marginTone = props.margin >= 0 ? "good" : props.margin >= -4 ? "warning" : "danger";
  const seatTypeInfo = explainSeatType(props.seatType);
  const otherSeatTypes = (props.eligibleSeatTypes || []).filter((code) => code !== props.seatType);
  const eligibilityText = props.universityEligibility === "HOME"
    ? "Home University"
    : props.universityEligibility === "OTHER"
      ? "Other Than Home University"
      : props.universityEligibility === "STATE"
        ? "State Level"
        : null;
  const collegeHref = props.collegeSlug
    ? {
        pathname: `/colleges/${props.collegeSlug}`,
        query: {
          branch: props.branch,
          year: props.year,
          round: props.round,
          seatType: props.seatType,
          score: props.studentScore,
          cutoff: props.closingCutoff,
          margin: props.margin,
          zone: props.zone
        }
      }
    : null;

  const strengthFacts = [
    hasValue(props.collegeType) ? ["Ownership", props.collegeType] : null,
    typeof props.autonomous === "boolean" ? ["Academic status", props.autonomous ? "Autonomous" : "Non-autonomous"] : null,
    hasValue(props.sanctionedIntake) ? ["Branch intake", props.sanctionedIntake] : null,
    hasValue(props.capSeats) ? ["CAP seats", props.capSeats] : null,
    hasValue(props.preferenceBand) ? ["Demand band", props.preferenceBand] : null
  ].filter(Boolean);

  return (
    <article className="min-w-0 overflow-hidden rounded-lg border border-line bg-white shadow-sm">
      <div className={`h-1 ${zoneBarClass[props.zone] || "bg-action"}`} />

      <header className="flex flex-wrap items-start justify-between gap-4 p-4 md:p-5">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase text-slate-500">Institute code {props.instituteCode}</p>
          <h3 className="mt-1 max-w-3xl text-lg font-semibold leading-6 text-ink">
            {collegeHref ? (
              <Link className="hover:text-action hover:underline" href={collegeHref}>{props.college}</Link>
            ) : props.college}
          </h3>
          <p className="mt-2 text-sm font-semibold text-action">{props.branch}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {[props.city, props.university].filter(Boolean).join(" | ")}
          </p>
        </div>
        <div className="grid shrink-0 justify-items-end gap-1.5">
          <span className={`rounded border px-3 py-1.5 text-xs font-semibold ${zoneClass[props.zone] || "border-line"}`}>
            {zoneText[props.zone] || props.zone}
          </span>
          {props.dataConfidence ? (
            <span className="text-xs text-slate-500">{props.dataConfidence === "HIGH" ? "High" : props.dataConfidence === "MEDIUM" ? "Medium" : "Limited"} history confidence</span>
          ) : null}
        </div>
      </header>

      {strengthFacts.length || hasValue(props.strengthIndex) ? (
        <section className="border-t border-line px-4 py-4 md:px-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-ink">College and branch strength</h4>
              <p className="mt-1 text-xs text-slate-500">Research signals, separate from your admission result.</p>
            </div>
            {hasValue(props.strengthIndex) ? (
              <div className="min-w-36 text-right">
                <p className="text-xs font-medium uppercase text-slate-500">Demand index</p>
                <p className="mt-1 text-2xl font-semibold text-ink">{props.strengthIndex}<span className="text-sm text-slate-500"> / 100</span></p>
                <div className="mt-1 h-1.5 overflow-hidden rounded bg-slate-200">
                  <div className="h-full bg-action" style={{ width: `${Math.min(100, props.strengthIndex)}%` }} />
                </div>
              </div>
            ) : null}
          </div>
          {strengthFacts.length ? (
            <dl className="mt-3 grid grid-cols-2 gap-x-5 border-y border-line sm:grid-cols-3 xl:grid-cols-5">
              {strengthFacts.map(([label, value]) => <SmallFact key={label} label={label} value={value} />)}
            </dl>
          ) : null}
        </section>
      ) : null}

      <section className="border-t border-line bg-panel px-4 py-4 md:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-semibold text-ink">Your admission match</h4>
            <p className="mt-1 text-xs text-slate-500">Recent years receive more importance in the benchmark.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {props.trend ? (
              <span className="rounded bg-white px-2 py-1 text-xs font-medium text-slate-700">
                {trendText[props.trend] || props.trend} {props.trendChange >= 0 ? "+" : ""}{formatNumber(props.trendChange)}
              </span>
            ) : null}
            <span className="rounded bg-white px-2 py-1 text-xs font-medium text-slate-700">
              {props.yearsAnalyzed || 1} year{props.yearsAnalyzed === 1 ? "" : "s"} analyzed
            </span>
          </div>
        </div>
        <dl className="mt-3 grid divide-y divide-line bg-white sm:grid-cols-4 sm:divide-x sm:divide-y-0">
          <Metric label="Your percentile" value={formatNumber(props.studentScore)} />
          <Metric label="Prediction benchmark" value={formatNumber(props.closingCutoff)} />
          <Metric label="Your margin" value={marginText} tone={marginTone} />
          {hasValue(props.latestCutoff) ? <Metric label="Latest cutoff" value={formatNumber(props.latestCutoff)} note={`${props.year} Round ${props.round}`} /> : null}
        </dl>
      </section>

      <section className="border-t border-line px-4 py-4 md:px-5">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase text-slate-500">Best applicable official record</p>
            <p className="mt-1 font-semibold text-ink">{seatTypeInfo.code} - {seatTypeInfo.title}</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {props.year}, CAP Round {props.round}.{eligibilityText ? ` ${eligibilityText} eligibility for this college.` : ""}
            </p>
          </div>
          {hasValue(props.latestFee) ? (
            <div className="sm:text-right">
              <p className="text-xs font-medium uppercase text-slate-500">Approved annual fee</p>
              <p className="mt-1 font-semibold text-ink">{formatMoney(props.latestFee)}</p>
              {props.latestFeeYear ? <p className="mt-1 text-xs text-slate-500">{props.latestFeeYear}</p> : null}
            </div>
          ) : null}
        </div>
      </section>

      <details className="border-t border-line px-4 py-4 text-sm md:px-5">
        <summary className="cursor-pointer font-semibold text-action">Why this result and cutoff history</summary>
        <p className="mt-3 max-w-3xl leading-6 text-slate-600">{props.reason}</p>
        <p className="mt-1 text-xs text-slate-500">Cutoff volatility: {formatNumber(props.volatility || 0)} percentile points.</p>

        {props.cutoffHistory?.length ? (
          <div className="mt-4 divide-y divide-line border-y border-line">
            {props.cutoffHistory.map((item) => (
              <div key={`${item.year}-${item.round}`} className="grid grid-cols-[1fr_auto] gap-3 py-3 sm:grid-cols-[120px_100px_1fr_90px]">
                <p className="font-medium text-ink">{item.year}</p>
                <p className="text-slate-600">Round {item.round}</p>
                <p className="text-slate-600">{item.seatType}</p>
                <p className="text-right font-semibold text-ink">{formatNumber(item.cutoff)}</p>
              </div>
            ))}
          </div>
        ) : null}

        {otherSeatTypes.length ? (
          <p className="mt-3 text-slate-600"><span className="font-medium text-ink">Other eligible seats:</span> {otherSeatTypes.join(", ")}</p>
        ) : null}
        {hasValue(props.strengthIndex) ? (
          <p className="mt-3 text-xs leading-5 text-slate-500">
            Demand index is calculated mainly from previous FE cutoff demand. It is not an official Maharashtra rank or placement score.
          </p>
        ) : null}
        {props.sourceUrl ? (
          <p className="mt-3 text-slate-600">
            Latest source{props.sourcePage ? `, PDF page ${props.sourcePage}` : ""}: {" "}
            <a className="font-medium text-action underline" href={props.sourceUrl} target="_blank" rel="noreferrer">View official cutoff</a>
          </p>
        ) : null}
      </details>

      <footer className="flex flex-wrap gap-2 border-t border-line px-4 py-4 md:px-5">
        {collegeHref ? (
          <Link className="focus-ring inline-flex min-h-11 items-center rounded bg-action px-4 text-sm font-semibold text-white" href={collegeHref}>View college details</Link>
        ) : null}
        <button className="focus-ring min-h-11 rounded border border-line bg-white px-4 text-sm font-medium" type="button">Compare</button>
        <button className="focus-ring min-h-11 rounded border border-line bg-white px-4 text-sm font-semibold" type="button">Save</button>
      </footer>
    </article>
  );
}
