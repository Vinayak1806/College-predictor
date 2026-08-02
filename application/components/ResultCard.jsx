"use client";

import Link from "next/link";
import { AlertTriangle, ArrowUpRight, BookmarkCheck, Building2, Info, MapPin, Scale } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveCapListToAccount, saveComparisonToAccount } from "../lib/accountStorage";
import {
  addComparisonItem,
  createComparisonItemFromResult,
  readComparisonList,
  writeComparisonList
} from "../lib/comparisonList";
import {
  addPreferenceItem,
  createPreferenceItemFromResult,
  readPreferenceList,
  writePreferenceList
} from "../lib/preferenceList";
import { classifyMargin } from "../lib/prediction";
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
  const router = useRouter();
  const [capListStatus, setCapListStatus] = useState("");
  const [compareStatus, setCompareStatus] = useState("");
  const singleYear = (props.yearsAnalyzed || 1) === 1;
  const officialCutoff = hasValue(props.latestCutoff) ? props.latestCutoff : props.closingCutoff;
  const selectedCutoffDifference = Number(props.studentScore) - Number(officialCutoff);
  const selectedDifferenceText = `${selectedCutoffDifference >= 0 ? "+" : ""}${formatNumber(selectedCutoffDifference)}`;
  const marginTone = selectedCutoffDifference >= 0 ? "good" : selectedCutoffDifference >= -4 ? "warning" : "danger";
  const selectedCutoffZone = classifyMargin(selectedCutoffDifference);
  const zoneNeedsExplanation = selectedCutoffZone !== props.zone;
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
  const allocationText = {
    HOME_FOR_OTHER: "Converted Home University allocation",
    OTHER_FOR_HOME: "Converted Other University allocation"
  }[props.cutoffSection];
  const comparisonText = selectedCutoffDifference >= 0
    ? `Your ${props.scoreLabel || "percentile"} is ${formatNumber(Math.abs(selectedCutoffDifference))} points above the selected official cutoff.`
    : `Your ${props.scoreLabel || "percentile"} is ${formatNumber(Math.abs(selectedCutoffDifference))} points below the selected official cutoff.`;
  const collegeHref = props.collegeSlug
    ? {
        pathname: `/colleges/${props.collegeSlug}`,
        query: {
          route: props.admissionRoute || "FE",
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
    hasValue(props.closingCutoff) && !singleYear ? ["Multi-year prediction benchmark", formatNumber(props.closingCutoff)] : null,
    hasValue(props.margin) && !singleYear ? ["Difference from prediction benchmark", `${props.margin >= 0 ? "+" : ""}${formatNumber(props.margin)}`] : null,
    hasValue(props.collegeType) ? ["Ownership", props.collegeType] : null,
    typeof props.autonomous === "boolean" ? ["Academic status", props.autonomous ? "Autonomous" : "Non-autonomous"] : null,
    hasValue(props.sanctionedIntake) ? ["Branch intake", props.sanctionedIntake] : null,
    hasValue(props.lateralEntrySeats) ? ["DSE lateral-entry seats", props.lateralEntrySeats] : null,
    hasValue(props.vacantSeats) ? ["Previous-intake vacancies", props.vacantSeats] : null,
    hasValue(props.capSeats) ? ["CAP seats", props.capSeats] : null,
    hasValue(props.preferenceBand) ? ["Demand band", props.preferenceBand] : null,
    hasValue(props.latestFee) ? ["Approved annual fee", `${formatMoney(props.latestFee)}${props.latestFeeYear ? ` (${props.latestFeeYear})` : ""}`] : null
  ].filter(Boolean);

  async function addToCapList() {
    const item = createPreferenceItemFromResult(props);
    const result = addPreferenceItem(readPreferenceList(), item);
    const nextItems = result.items;

    if (result.added) {
      writePreferenceList(nextItems);
    }

    setCapListStatus(result.added ? "Added to CAP List" : "Already in CAP List");
    try {
      const { response } = await saveCapListToAccount(nextItems);
      if (response?.ok) setCapListStatus("Saved to your account");
      else if (response?.status !== 401) setCapListStatus("Saved on this device");
    } catch {
      setCapListStatus("Saved on this device");
    }
  }

  async function syncComparison(items, route) {
    try {
      await saveComparisonToAccount(items, route);
    } catch {
      // The browser copy remains available when account sync is unavailable.
    }
  }

  async function addToCompare() {
    const comparisonHref = `/compare?route=${props.admissionRoute === "DSE" ? "DSE" : "FE"}`;
    if (compareStatus === "View comparison") {
      router.push(comparisonHref);
      return;
    }

    const item = createComparisonItemFromResult(props);
    const result = addComparisonItem(readComparisonList(), item);

    if (result.added) {
      writeComparisonList(result.items);
      await syncComparison(result.items, props.admissionRoute === "DSE" ? "DSE" : "FE");
      setCompareStatus("View comparison");
    } else if (result.reason === "DUPLICATE") {
      await syncComparison(result.items, props.admissionRoute === "DSE" ? "DSE" : "FE");
      setCompareStatus("View comparison");
    } else {
      router.push(comparisonHref);
    }
  }

  return (
    <article className="min-w-0 overflow-hidden rounded-lg border border-line bg-white">
      <div className={`h-1 ${zoneBarClass[props.zone] || "bg-action"}`} />

      <header className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start md:p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold uppercase text-slate-500">
            <span>Institute {props.instituteCode}</span>
            {hasValue(props.strengthIndex) ? <span>Demand index {props.strengthIndex}/100</span> : null}
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
            <p className={`text-xl font-semibold ${selectedCutoffDifference >= 0 ? "text-success" : selectedCutoffDifference >= -4 ? "text-warning" : "text-danger"}`}>
              {selectedDifferenceText}
            </p>
            <p className="text-xs text-slate-500">selected cutoff difference</p>
          </div>
        </div>
      </header>

      <section className="border-y border-line bg-panel px-4 py-4 md:px-5">
        <div>
          <p className="text-xs font-medium uppercase text-slate-500">Admission match</p>
          <p className="mt-1 text-sm font-semibold text-ink">{comparisonText}</p>
        </div>
        <dl className="mt-3 grid divide-y divide-line bg-white sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <Metric label={`Your ${props.scoreLabel || "percentile"}`} value={formatNumber(props.studentScore)} />
          <Metric
            label="Selected official cutoff"
            value={formatNumber(officialCutoff)}
            note={`${props.year}, CAP Round ${props.round}`}
          />
          <Metric
            label="Difference from selected cutoff"
            value={selectedDifferenceText}
            tone={marginTone}
            note="Positive means your score is above this cutoff"
          />
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
            {[`${props.year}, CAP Round ${props.round}`, eligibilityText, allocationText].filter(Boolean).join(" | ")}
          </p>
        </div>
        <p className="text-xs text-slate-500 sm:text-right">{confidenceText}</p>
      </section>

      {props.confidenceWarning ? (
        <div className="flex items-start gap-2 border-t border-warning bg-amber-50 px-4 py-3 text-sm text-slate-700 md:px-5">
          <AlertTriangle aria-hidden="true" className="mt-0.5 shrink-0 text-warning" size={17} />
          <p>{props.confidenceWarning}</p>
        </div>
      ) : null}

      <details className="border-t border-line text-sm">
        <summary className="focus-ring cursor-pointer px-4 py-4 font-semibold text-action md:px-5">
          Why this result, college strength and cutoff history
        </summary>
        <div className="border-t border-line px-4 py-4 md:px-5">
          <p className="max-w-3xl leading-6 text-slate-600">{props.reason}</p>

          {props.zoneExplanation ? (
            <div className="mt-3 border-l-2 border-action pl-3">
              <p className="text-xs font-semibold uppercase text-action">How the admission status was calculated</p>
              <p className="mt-1 max-w-3xl leading-6 text-slate-600">{props.zoneExplanation}</p>
            </div>
          ) : null}

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
            Historical demand is a research signal based mainly on previous {props.admissionRoute || "FE"} cutoffs. It is not an official Maharashtra college rank.
          </p>
          {props.sourceUrl ? (
            <p className="mt-3 text-slate-600">
              Official source{props.sourcePage ? `, PDF page ${props.sourcePage}` : ""}:{" "}
              <a className="font-medium text-action underline" href={props.sourceUrl} target="_blank" rel="noreferrer">
                View cutoff record
              </a>
            </p>
          ) : props.sourceFilename ? (
            <p className="mt-3 text-slate-600">
              <span className="font-medium text-ink">Official source:</span> {props.sourceFilename}
              {props.sourcePage ? `, PDF page ${props.sourcePage}` : ""}
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
        <button
          className="focus-ring inline-flex min-h-11 items-center gap-2 rounded border border-line bg-white px-4 text-sm font-medium"
          type="button"
          onClick={addToCompare}
        >
          <Scale aria-hidden="true" size={17} /> {compareStatus || "Add to compare"}
        </button>
        <button
          className="focus-ring inline-flex min-h-11 items-center gap-2 rounded border border-line bg-white px-4 text-sm font-semibold"
          type="button"
          onClick={addToCapList}
        >
          <BookmarkCheck aria-hidden="true" size={17} /> {capListStatus || "Add to CAP List"}
        </button>
      </footer>
    </article>
  );
}
