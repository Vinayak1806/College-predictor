import Link from "next/link";
import { explainSeatType } from "../lib/seatTypes";

const zoneClass = {
  SAFE: "border-success text-success",
  TARGET: "border-action text-action",
  AMBITIOUS: "border-warning text-warning",
  HIGHLY_AMBITIOUS: "border-danger text-danger"
};

const zoneText = {
  SAFE: "Safe",
  TARGET: "Target",
  AMBITIOUS: "Ambitious",
  HIGHLY_AMBITIOUS: "Highly Ambitious"
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

function Fact({ label, value, tone = "normal" }) {
  const toneClass = {
    normal: "text-ink",
    good: "text-success",
    warning: "text-warning",
    danger: "text-danger"
  };

  return (
    <div className="min-w-0 px-3 py-3">
      <dt className="text-xs font-medium uppercase text-slate-500">{label}</dt>
      <dd className={`mt-1 break-words text-base font-semibold ${toneClass[tone]}`}>{value}</dd>
    </div>
  );
}

function FactGrid({ children, columns = "sm:grid-cols-3" }) {
  return (
    <dl className={`mt-2 grid divide-y divide-line border-y border-line sm:divide-x sm:divide-y-0 ${columns}`}>
      {children}
    </dl>
  );
}

export function ResultCard(props) {
  const marginText = `${props.margin >= 0 ? "+" : ""}${formatNumber(props.margin)}`;
  const marginTone = props.margin >= 0 ? "good" : props.margin >= -4 ? "warning" : "danger";
  const seatTypeInfo = explainSeatType(props.seatType);
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
  const hasStrengthData =
    hasValue(props.collegeType) ||
    typeof props.autonomous === "boolean" ||
    hasValue(props.sanctionedIntake) ||
    hasValue(props.capSeats) ||
    hasValue(props.preferenceBand);
  const hasExtraSeatData =
    hasValue(props.ewsSeats) || hasValue(props.tfwsSeats) || hasValue(props.allIndiaSeats);

  return (
    <article className="rounded-lg border border-line bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-ink">
            {collegeHref ? (
              <Link className="hover:text-action hover:underline" href={collegeHref}>
                {props.college}
              </Link>
            ) : (
              props.college
            )}
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            {props.branch}
            {props.city ? ` | ${props.city}` : ""}
          </p>
        </div>
        <span className={`rounded border px-2 py-1 text-xs font-semibold ${zoneClass[props.zone] ?? "border-line"}`}>
          {zoneText[props.zone] || props.zone}
        </span>
      </div>

      {hasStrengthData ? (
        <section className="mt-4">
          <h4 className="text-sm font-semibold text-ink">College and branch strength</h4>
          <FactGrid columns="sm:grid-cols-2 lg:grid-cols-5">
            {hasValue(props.collegeType) ? <Fact label="Institute ownership" value={props.collegeType} /> : null}
            {typeof props.autonomous === "boolean" ? (
              <Fact label="Academic autonomy" value={props.autonomous ? "Autonomous" : "Non-autonomous"} />
            ) : null}
            {hasValue(props.sanctionedIntake) ? (
              <Fact label="Approved branch intake" value={props.sanctionedIntake} />
            ) : null}
            {hasValue(props.capSeats) ? <Fact label="CAP seats for this branch" value={props.capSeats} /> : null}
            {hasValue(props.preferenceBand) ? <Fact label="Student demand" value={props.preferenceBand} /> : null}
          </FactGrid>
        </section>
      ) : null}

      {hasValue(props.fitScore) ? (
        <section className="mt-4 flex flex-wrap items-center justify-between gap-3 border-y border-line bg-panel px-3 py-3">
          <div>
            <p className="text-xs font-medium uppercase text-slate-500">Result priority</p>
            <p className="mt-1 text-xl font-semibold text-ink">{props.fitScore} / 100</p>
          </div>
          <p className="max-w-lg text-sm text-slate-600">
            Used to order useful results. It combines cutoff fit, ownership, autonomy, intake, seats and student
            demand. It is not an admission probability.
          </p>
        </section>
      ) : null}

      <section className="mt-4">
        <h4 className="text-sm font-semibold text-ink">Cutoff match</h4>
        <FactGrid>
          <Fact label="Your percentile" value={formatNumber(props.studentScore)} />
          <Fact label="Closing percentile" value={formatNumber(props.closingCutoff)} />
          <Fact label="Cutoff margin" value={marginText} tone={marginTone} />
        </FactGrid>
      </section>

      <section className="mt-4">
        <h4 className="text-sm font-semibold text-ink">Cutoff record used</h4>
        <FactGrid>
          <Fact label="Academic year" value={props.year} />
          <Fact label="CAP round" value={`Round ${props.round}`} />
          <Fact label="Applicable seat type" value={seatTypeInfo.code} />
        </FactGrid>
        <div className="mt-3 border-l-2 border-action pl-3 text-sm">
          <p className="font-semibold text-ink">{seatTypeInfo.title}</p>
          <p className="mt-1 text-slate-600">{seatTypeInfo.note}</p>
        </div>
      </section>

      {hasValue(props.latestFee) ? (
        <section className="mt-4 border-t border-line pt-4">
          <p className="text-xs font-medium uppercase text-slate-500">
            Approved annual fee{props.latestFeeYear ? ` (${props.latestFeeYear})` : ""}
          </p>
          <p className="mt-1 text-base font-semibold text-ink">{formatMoney(props.latestFee)}</p>
        </section>
      ) : null}

      <details className="mt-4 border-t border-line pt-3 text-sm">
        <summary className="cursor-pointer font-medium text-action">Why this result?</summary>
        {hasExtraSeatData ? (
          <FactGrid columns="sm:grid-cols-3">
            {hasValue(props.ewsSeats) ? <Fact label="EWS seats" value={props.ewsSeats} /> : null}
            {hasValue(props.tfwsSeats) ? <Fact label="TFWS seats" value={props.tfwsSeats} /> : null}
            {hasValue(props.allIndiaSeats) ? <Fact label="All India seats" value={props.allIndiaSeats} /> : null}
          </FactGrid>
        ) : null}
        <p className="mt-3 text-slate-600">{props.reason}</p>
        {props.sourceUrl ? (
          <p className="mt-2 text-slate-600">
            Source: {props.year} CAP Round {props.round}.{" "}
            <a className="font-medium text-action underline" href={props.sourceUrl} target="_blank" rel="noreferrer">
              View official cutoff source
            </a>
          </p>
        ) : null}
      </details>

      <div className="mt-4 flex flex-wrap gap-2">
        {collegeHref ? (
          <Link
            className="focus-ring inline-flex min-h-11 items-center rounded bg-action px-4 text-sm font-semibold text-white"
            href={collegeHref}
          >
            View college
          </Link>
        ) : null}
        <button className="focus-ring min-h-11 rounded border border-line px-3 text-sm" type="button">
          Compare
        </button>
        <button className="focus-ring min-h-11 rounded border border-line px-3 text-sm font-semibold" type="button">
          Save
        </button>
      </div>
    </article>
  );
}
