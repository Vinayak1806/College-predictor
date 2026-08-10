"use client";

import Link from "next/link";
import { ArrowUpRight, BookmarkCheck, Info, Scale } from "lucide-react";
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
import { ResultCardDetails } from "./ResultCardDetails";
import { ResultCardSummary } from "./ResultCardSummary";
import { formatResultMoney, formatResultNumber, hasResultValue, zoneBarClass } from "./resultCardUtils";

export function ResultCard(props) {
  const router = useRouter();
  const [capListStatus, setCapListStatus] = useState("");
  const [compareStatus, setCompareStatus] = useState("");
  const singleYear = (props.yearsAnalyzed || 1) === 1;
  const officialCutoff = hasResultValue(props.latestCutoff) ? props.latestCutoff : props.closingCutoff;
  const selectedCutoffDifference = Number(props.studentScore) - Number(officialCutoff);
  const selectedDifferenceText = `${selectedCutoffDifference >= 0 ? "+" : ""}${formatResultNumber(selectedCutoffDifference)}`;
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
    ? `Your ${props.scoreLabel || "percentile"} is ${formatResultNumber(Math.abs(selectedCutoffDifference))} points above the selected official cutoff.`
    : `Your ${props.scoreLabel || "percentile"} is ${formatResultNumber(Math.abs(selectedCutoffDifference))} points below the selected official cutoff.`;
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
          cutoff: officialCutoff,
          margin: selectedCutoffDifference,
          zone: props.zone
        }
      }
    : null;

  const detailFacts = [
    hasResultValue(props.strengthIndex) ? ["Historical demand index", `${props.strengthIndex} / 100`] : null,
    hasResultValue(props.closingCutoff) && !singleYear ? ["Multi-year prediction benchmark", formatResultNumber(props.closingCutoff)] : null,
    hasResultValue(props.margin) && !singleYear ? ["Difference from prediction benchmark", `${props.margin >= 0 ? "+" : ""}${formatResultNumber(props.margin)}`] : null,
    hasResultValue(props.collegeType) ? ["Ownership", props.collegeType] : null,
    typeof props.autonomous === "boolean" ? ["Academic status", props.autonomous ? "Autonomous" : "Non-autonomous"] : null,
    hasResultValue(props.sanctionedIntake) ? ["Branch intake", props.sanctionedIntake] : null,
    hasResultValue(props.lateralEntrySeats) ? ["DSE lateral-entry seats", props.lateralEntrySeats] : null,
    hasResultValue(props.vacantSeats) ? ["Previous-intake vacancies", props.vacantSeats] : null,
    hasResultValue(props.capSeats) ? ["CAP seats", props.capSeats] : null,
    hasResultValue(props.preferenceBand) ? ["Demand band", props.preferenceBand] : null,
    hasResultValue(props.latestFee) ? ["Approved annual fee", `${formatResultMoney(props.latestFee)}${props.latestFeeYear ? ` (${props.latestFeeYear})` : ""}`] : null
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
    <article className="result-card surface-card min-w-0 overflow-hidden rounded-xl transition-[border-color,box-shadow] duration-250">
      <div className={`h-1.5 ${zoneBarClass[props.zone] || "bg-gradient-to-r from-action to-cyan-500"}`} />

      <ResultCardSummary
        result={props}
        collegeHref={collegeHref}
        officialCutoff={officialCutoff}
        selectedCutoffDifference={selectedCutoffDifference}
        selectedDifferenceText={selectedDifferenceText}
        marginTone={marginTone}
        zoneNeedsExplanation={zoneNeedsExplanation}
        seatTypeInfo={seatTypeInfo}
        eligibilityText={eligibilityText}
        allocationText={allocationText}
        confidenceText={confidenceText}
        comparisonText={comparisonText}
      />
      <ResultCardDetails result={props} detailFacts={detailFacts} otherSeatTypes={otherSeatTypes} />

      {!hasResultValue(props.latestFee) ? (
        <div className="flex items-start gap-2.5 border-t border-amber-200 bg-amber-50/80 px-4 py-3 text-xs leading-5 text-amber-800 md:px-5">
          <Info aria-hidden="true" className="mt-0.5 shrink-0 text-amber-500" size={16} />
          <p>
            A verified current fee is not available in our records. Use <strong>View college</strong> below and confirm the latest fee on the college&apos;s official website or the Maharashtra Fee Regulating Authority website.
          </p>
        </div>
      ) : null}

      <footer className="flex flex-wrap gap-2 border-t border-line bg-slate-50/50 px-4 py-4 md:px-5">
        {collegeHref ? (
          <Link
            className="btn-primary focus-ring w-full shadow-sm sm:w-auto"
            href={collegeHref}
          >
            View college <ArrowUpRight aria-hidden="true" size={17} />
          </Link>
        ) : null}
        <button
          className="btn-secondary focus-ring w-full sm:w-auto"
          type="button"
          onClick={addToCompare}
        >
          <Scale aria-hidden="true" size={17} /> {compareStatus || "Add to compare"}
        </button>
        <button
          className="btn-secondary focus-ring w-full sm:w-auto"
          type="button"
          onClick={addToCapList}
        >
          <BookmarkCheck aria-hidden="true" size={17} /> {capListStatus || "Add to CAP List"}
        </button>
      </footer>
    </article>
  );
}
