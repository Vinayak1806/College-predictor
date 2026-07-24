import Link from "next/link";
import { ArrowUpRight, Bookmark, Building2, MapPin, Scale } from "lucide-react";
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
  RISING: "Rising",
  STABLE: "Stable",
  FALLING: "Falling"
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
      {note ? <p className="mt-1 text-xs leading-5 text-slate-500">{note}</p> : null}
    </div>
  );
}

function DetailFact({ label, value }) {
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
  const singleYear = (props.yearsAnalyzed || 1) === 1;
  const officialCutoff = hasValue(props.latestCutoff) ? props.latestCutoff : props.closingCutoff;
  const seatTypeInfo = explainSeatType(props.seatType);
  const otherSeatTypes = (props.eligibleSeatTypes || []).filter((code) => code !== props.seatType);
  const eligibilityText = props.universityEligibility === "HOME"
    ? "Home University"
    : props.universityEligibility === "OTHER"
      ? "Other Than Home University"
      : props.universityEligibility === "STATE"
        ? "State Level"
        : null;
  const confidenceText = props.dataConfidence === "HIGH"
    ? "High history confidence"
    : props.dataConfidence === "MEDIUM"
      ? "Medium history confidence"
      : "Limited history confidence";
  const comparisonText = props.margin >= 0
    ? `Your percentile is ${formatNumber(Math.abs(props.margin))} points above the ${singleYear ? "official cutoff" : "prediction benchmark"}.`
    : `Your percentile is ${formatNumber(Math.abs(props.margin))} points below the ${singleYear ? "official cutoff" : "prediction benchmark"}.`;
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

  const detailFacts = [
    hasValue(props.strengthIndex) ? ["Historical demand index", `${props.strengthIndex} / 100`] : null,
    hasValue(props.collegeType) ? ["Ownership", props.collegeType] : null,
    typeof props.autonomous === "boolean" ? ["Academic status", props.autonomous ? "Autonomous" : "Non-autonomous"] : null,
    hasValue(props.sanctionedIntake) ? ["Branch intake", props.sanctionedIntake] : null,
    hasValue(props.capSeats) ? ["CAP seats", props.capSeats] : null,
    hasValue(props.preferenceBand) ? ["Demand band", props.preferenceBand] : null,
    hasValue(props.latestFee) ? ["Approved annual fee", `${formatMoney(props.latestFee)}${props.latestFeeYear ? ` (${props.latestFeeYear})` : ""}`] : null
  ].filter(Boolean);

  return (
    <article className="min-w-0 overflow-hidden rounded-lg border border-line bg-white">
      <div className={`h-1 ${zoneBarClass[props.zone] || "bg-action"}`} />

      <header className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start md:p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold uppercase text-slate-500">
            {props.position ? <span>Option {props.position}</span> : null}
            <span>Institute {props.instituteCode}</span>
          </div>
          <h3 className="mt-2 max-w-3xl text-lg font-semibold leading-6 text-ink">
            {collegeHref ? (
              <Link className="hover:text-action hover:underline" href={collegeHref}>{props.college}</Link>
            ) : props.college}
          </h3>
          <p className="mt-2 font-semibold text-action">{props.branch}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            {props.city ? <span className="inline-flex items-center gap-1"><MapPin aria-hidden="true" size={14} />{props.city}</span> : null}
            {props.university ? <span className="inline-flex items-center gap-1"><Building2 aria-hidden="true" size={14} />{props.university}</span> : null}
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 sm:grid sm:justify-items-end">
          <span className={`rounded border px-3 py-1.5 text-xs font-semibold ${zoneClass[props.zone] || "border-line"}`}>
            {zoneText[props.zone] || props.zone}
          </span>
          <div className="text-right">
            <p className={`text-xl font-semibold ${props.margin >= 0 ? "text-success" : props.margin >= -4 ? "text-warning" : "text-danger"}`}>
              {marginText}
            </p>
            <p className="text-xs text-slate-500">percentile margin</p>
          </div>
        </div>
      </header>

      <section className="border-y border-line bg-panel px-4 py-4 md:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase text-slate-500">Admission match</p>
            <p className="mt-1 text-sm font-semibold text-ink">{comparisonText}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-slate-600">
            {props.trend ? <span>{trendText[props.trend] || props.trend} cutoff</span> : null}
            <span>{props.yearsAnalyzed || 1} year{props.yearsAnalyzed === 1 ? "" : "s"} analyzed</span>
          </div>
        </div>
        <dl className={`mt-3 grid divide-y divide-line bg-white sm:divide-x sm:divide-y-0 ${singleYear ? "sm:grid-cols-3" : "sm:grid-cols-4"}`}>
          <Metric label="Your percentile" value={formatNumber(props.studentScore)} />
          <Metric
            label="Latest official cutoff"
            value={formatNumber(officialCutoff)}
            note={`${props.year}, CAP Round ${props.round}`}
          />
          {!singleYear ? (
            <Metric
              label="Prediction benchmark"
              value={formatNumber(props.closingCutoff)}
              note="Recent comparable years weighted more"
            />
          ) : null}
          <Metric
            label="Your margin"
            value={marginText}
            tone={marginTone}
            note="Positive means above the benchmark"
          />
        </dl>
      </section>

      <section className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center md:px-5">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase text-slate-500">Official seat used</p>
          <p className="mt-1 font-semibold text-ink">{seatTypeInfo.code} - {seatTypeInfo.title}</p>
          <p className="mt-1 text-sm text-slate-600">
            {[`${props.year}, CAP Round ${props.round}`, eligibilityText].filter(Boolean).join(" | ")}
          </p>
        </div>
        <p className="text-xs text-slate-500 sm:text-right">{confidenceText}</p>
      </section>

      <details className="border-t border-line text-sm">
        <summary className="focus-ring cursor-pointer px-4 py-4 font-semibold text-action md:px-5">
          Why this result, college strength and cutoff history
        </summary>
        <div className="border-t border-line px-4 py-4 md:px-5">
          <p className="max-w-3xl leading-6 text-slate-600">{props.reason}</p>

          {detailFacts.length ? (
            <dl className="mt-3 grid grid-cols-2 gap-x-5 border-y border-line sm:grid-cols-3 xl:grid-cols-4">
              {detailFacts.map(([label, value]) => <DetailFact key={label} label={label} value={value} />)}
            </dl>
          ) : null}

          {props.cutoffHistory?.length ? (
            <div className="mt-4">
              <p className="text-xs font-medium uppercase text-slate-500">Comparable cutoff records</p>
              <div className="mt-2 divide-y divide-line border-y border-line">
                {props.cutoffHistory.map((item) => (
                  <div key={`${item.year}-${item.round}`} className="grid grid-cols-[1fr_auto] gap-3 py-3 sm:grid-cols-[120px_100px_1fr_90px]">
                    <p className="font-medium text-ink">{item.year}</p>
                    <p className="text-slate-600">Round {item.round}</p>
                    <p className="text-slate-600">{item.seatType}</p>
                    <p className="text-right font-semibold text-ink">{formatNumber(item.cutoff)}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {otherSeatTypes.length ? (
            <p className="mt-3 text-slate-600"><span className="font-medium text-ink">Other eligible seats:</span> {otherSeatTypes.join(", ")}</p>
          ) : null}
          <p className="mt-3 text-xs leading-5 text-slate-500">
            Historical demand is a research signal based mainly on previous FE cutoffs. It is not an official Maharashtra college rank.
          </p>
          {props.sourceUrl ? (
            <p className="mt-3 text-slate-600">
              Official source{props.sourcePage ? `, PDF page ${props.sourcePage}` : ""}:{" "}
              <a className="font-medium text-action underline" href={props.sourceUrl} target="_blank" rel="noreferrer">
                View cutoff record
              </a>
            </p>
          ) : null}
        </div>
      </details>

      <footer className="flex flex-wrap gap-2 border-t border-line px-4 py-4 md:px-5">
        {collegeHref ? (
          <Link
            className="focus-ring inline-flex min-h-11 items-center gap-2 rounded bg-action px-4 text-sm font-semibold text-white"
            href={collegeHref}
          >
            View college <ArrowUpRight aria-hidden="true" size={17} />
          </Link>
        ) : null}
        <button className="focus-ring inline-flex min-h-11 items-center gap-2 rounded border border-line bg-white px-4 text-sm font-medium" type="button">
          <Scale aria-hidden="true" size={17} /> Compare
        </button>
        <button className="focus-ring inline-flex min-h-11 items-center gap-2 rounded border border-line bg-white px-4 text-sm font-semibold" type="button">
          <Bookmark aria-hidden="true" size={17} /> Save
        </button>
      </footer>
    </article>
  );
}
