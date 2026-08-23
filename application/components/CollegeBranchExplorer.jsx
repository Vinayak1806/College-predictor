"use client";

import { useEffect, useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Check, Plus } from "lucide-react";
import { explainSeatType, matchesSeatGroup, seatTypeGroups, sortCutoffsByLatestAndOpen } from "../lib/seatTypes";
import { addPreferenceItem, preferenceItemId, readPreferenceList, writePreferenceList } from "../lib/preferenceList";
import { saveCapListToAccount } from "../lib/accountStorage";

function hasValue(value) {
  return value !== null && value !== undefined && value !== "" && value !== "N/A";
}

function InfoBox({ label, value }) {
  return (
    <div className="rounded border border-line bg-white p-3">
      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-base font-semibold text-ink">{value}</p>
    </div>
  );
}

function findYears(branch) {
  const years = new Set();

  for (const row of branch.seatRows) {
    years.add(row.academicYear);
  }

  for (const row of branch.cutoffRows) {
    years.add(row.academicYear);
  }

  return [...years].sort().reverse();
}

function findSeatTypes(branch) {
  const seatTypes = new Set();

  for (const row of branch.cutoffRows) {
    seatTypes.add(row.seatType);
  }

  return [...seatTypes].sort();
}

function SeatTypeText({ code }) {
  const seatTypeInfo = explainSeatType(code);

  return (
    <>
      <span className="block font-semibold text-ink">{seatTypeInfo.code}</span>
      <span className="mt-1 block text-xs text-slate-600">{seatTypeInfo.title}</span>
    </>
  );
}

function FilterButton({ active, children, onClick }) {
  return (
    <button
      className={`focus-ring min-h-11 max-w-full rounded border px-4 py-2 text-left text-sm font-semibold ${
        active ? "border-action bg-action text-white" : "border-line bg-white text-slate-700 hover:bg-panel"
      }`}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function CollegeBranchExplorer({ branches, initialBranchName, initialYear, initialSeatType, admissionRoute = "FE", college }) {
  const initialBranch = initialBranchName
    ? branches.find((branch) => branch.branchName.toLowerCase() === initialBranchName.toLowerCase())
    : null;
  const [selectedBranchCode, setSelectedBranchCode] = useState(initialBranch?.branchCode || branches[0]?.branchCode || "");
  const [selectedYear, setSelectedYear] = useState(initialYear || "ALL");
  const [selectedSeatGroup, setSelectedSeatGroup] = useState("ALL");
  const [selectedSeatType, setSelectedSeatType] = useState(initialSeatType || "ALL");
  const [capListStatus, setCapListStatus] = useState("");

  const selectedBranch =
    branches.find((branch) => branch.branchCode === selectedBranchCode) ||
    branches[0] ||
    null;

  useEffect(() => {
    if (!college || !selectedBranch) return;
    const existing = readPreferenceList().some(
      (item) => item.id === preferenceItemId(college.instituteCode, selectedBranch.branchCode)
    );
    setCapListStatus(existing ? "In your CAP List" : "");
  }, [college, selectedBranch]);

  async function addToCapList() {
    if (!college || !selectedBranch) return;

    const sortedCutoffs = sortCutoffsByLatestAndOpen(selectedBranch.cutoffRows || []);
    const latestCutoffRow = sortedCutoffs[0];
    const item = {
      id: preferenceItemId(college.instituteCode, selectedBranch.branchCode),
      instituteCode: college.instituteCode,
      collegeSlug: college.slug,
      college: college.name,
      branchCode: selectedBranch.branchCode,
      branch: selectedBranch.branchName,
      city: college.city || "",
      zone: "TARGET",
      cutoff: latestCutoffRow?.closingScore ? Number(latestCutoffRow.closingScore) : null,
      margin: null,
      seatType: latestCutoffRow?.seatType || "GOPENS",
      year: latestCutoffRow?.academicYear || selectedBranch.latestYear || "",
      round: latestCutoffRow?.capRound ?? null,
      source: "COLLEGE_EXPLORER",
      addedAt: new Date().toISOString()
    };

    const result = addPreferenceItem(readPreferenceList(), item);
    if (result.added) {
      writePreferenceList(result.items);
      setCapListStatus("Added to CAP List");
      try {
        await saveCapListToAccount(result.items);
      } catch {
        // Saved locally
      }
    } else {
      setCapListStatus("Already in CAP List");
    }
  }

  const years = selectedBranch ? findYears(selectedBranch) : [];
  const seatTypes = selectedBranch ? findSeatTypes(selectedBranch) : [];
  const visibleSeatTypes = seatTypes.filter((seatType) => {
    return matchesSeatGroup(seatType, selectedSeatGroup);
  });
  const seatRows =
    selectedBranch && selectedYear !== "ALL"
      ? selectedBranch.seatRows.filter((row) => row.academicYear === selectedYear)
      : selectedBranch?.seatRows || [];
  const cutoffRows = (selectedBranch?.cutoffRows || []).filter((row) => {
    const matchesYear = selectedYear === "ALL" || row.academicYear === selectedYear;
    const matchesGroup = matchesSeatGroup(row.seatType, selectedSeatGroup);
    const matchesSeatType = selectedSeatType === "ALL" || row.seatType === selectedSeatType;

    return matchesYear && matchesGroup && matchesSeatType;
  });
  const latestSeat = selectedBranch?.seatRows[0];
  const trendData = useMemo(() => {
    if (!selectedBranch || selectedSeatType === "ALL") return [];

    const latestByYear = new Map();
    for (const row of selectedBranch.cutoffRows) {
      if (row.seatType !== selectedSeatType) continue;
      const current = latestByYear.get(row.academicYear);
      if (!current || row.capRound > current.capRound) latestByYear.set(row.academicYear, row);
    }

    return [...latestByYear.values()]
      .sort((a, b) => a.academicYear.localeCompare(b.academicYear))
      .map((row) => ({ year: row.academicYear, cutoff: Number(row.closingScore), round: row.capRound }));
  }, [selectedBranch, selectedSeatType]);

  function chooseBranch(branchCode) {
    setSelectedBranchCode(branchCode);
    setSelectedYear("ALL");
    setSelectedSeatGroup("ALL");
    setSelectedSeatType("ALL");
  }

  function chooseSeatGroup(group) {
    setSelectedSeatGroup(group);
    setSelectedSeatType("ALL");
  }

  return (
    <section className="mt-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">Branch explorer</h2>
          <p className="mt-1 text-sm text-slate-600">
            Select one branch first, then check year-wise seats and cutoff history.
          </p>
        </div>
      </div>

      <div className="mt-3 grid gap-4">
        <aside className="surface-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-ink">Available branches ({branches.length})</p>
            <p className="text-xs text-slate-500">Choose one to update the information below</p>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {branches.map((branch) => (
              <button
                key={branch.branchCode}
                className={`focus-ring min-w-0 rounded border p-3 text-left text-sm transition-colors ${
                  selectedBranch?.branchCode === branch.branchCode
                    ? "border-action bg-panel"
                    : "border-line bg-white hover:bg-panel"
                }`}
                type="button"
                onClick={() => chooseBranch(branch.branchCode)}
              >
                <span className="block font-semibold text-ink">{branch.branchName}</span>
                <span className="mt-1 block text-xs text-slate-500">
                  {branch.branchCode}
                  {branch.latestYear ? ` | ${branch.latestYear}` : ""}
                  {hasValue(branch.latestIntake) ? ` | ${admissionRoute === "DSE" ? "Lateral seats" : "Intake"} ${branch.latestIntake}` : ""}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <div className="grid min-w-0 gap-4">
          {!selectedBranch ? (
            <div className="rounded-lg border border-warning bg-white p-4 text-sm text-warning">
              No branch data found for this college.
            </div>
          ) : (
            <>
              <section className="surface-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-ink">{selectedBranch.branchName}</h3>
                    <p className="mt-1 text-sm text-slate-600">Branch code: {selectedBranch.branchCode}</p>
                  </div>
                  {college ? (
                    <button
                      type="button"
                      className={`focus-ring inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-xs font-semibold shadow-xs transition-all ${
                        capListStatus === "Added to CAP List" || capListStatus === "In your CAP List"
                          ? "border border-emerald-200 bg-emerald-50 text-emerald-700 font-bold"
                          : "bg-action text-white hover:bg-action-dark active:scale-98"
                      }`}
                      onClick={addToCapList}
                    >
                      {capListStatus === "Added to CAP List" || capListStatus === "In your CAP List" ? (
                        <Check aria-hidden="true" size={15} />
                      ) : (
                        <Plus aria-hidden="true" size={15} />
                      )}
                      <span>{capListStatus || "Add to CAP List"}</span>
                    </button>
                  ) : null}
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                  {hasValue(latestSeat?.academicYear) ? <InfoBox label="Latest seat year" value={latestSeat.academicYear} /> : null}
                  {hasValue(latestSeat?.sanctionedIntake) ? (
                    <InfoBox label="Approved branch intake" value={latestSeat.sanctionedIntake} />
                  ) : null}
                  {hasValue(latestSeat?.lateralEntrySeats) ? (
                    <InfoBox label="DSE lateral-entry seats" value={latestSeat.lateralEntrySeats} />
                  ) : null}
                  {hasValue(latestSeat?.vacantSeats) ? (
                    <InfoBox label="Previous-intake vacancies" value={latestSeat.vacantSeats} />
                  ) : null}
                  {hasValue(latestSeat?.capSeats) ? (
                    <InfoBox label="CAP seats for this branch" value={latestSeat.capSeats} />
                  ) : null}
                  {hasValue(latestSeat?.tfwsSeats) ? <InfoBox label="TFWS seats" value={latestSeat.tfwsSeats} /> : null}
                </dl>

                <div className="mt-4 border-t border-line pt-4">
                  <p className="text-sm font-semibold text-ink">Choose year</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <FilterButton active={selectedYear === "ALL"} onClick={() => setSelectedYear("ALL")}>
                      All years
                    </FilterButton>
                    {years.map((year) => (
                      <FilterButton key={year} active={selectedYear === year} onClick={() => setSelectedYear(year)}>
                        {year}
                      </FilterButton>
                    ))}
                  </div>
                </div>

                <div className="mt-4 border-t border-line pt-4">
                  <p className="text-sm font-semibold text-ink">Choose seat group</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {seatTypeGroups.map((group) => (
                      <FilterButton
                        key={group.value}
                        active={selectedSeatGroup === group.value}
                        onClick={() => chooseSeatGroup(group.value)}
                      >
                        {group.label}
                      </FilterButton>
                    ))}
                  </div>
                </div>

                <div className="mt-4 border-t border-line pt-4">
                  <p className="text-sm font-semibold text-ink">Choose exact seat type</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <FilterButton active={selectedSeatType === "ALL"} onClick={() => setSelectedSeatType("ALL")}>
                      All seats
                    </FilterButton>
                    {visibleSeatTypes.map((seatType) => (
                      <FilterButton
                        key={seatType}
                        active={selectedSeatType === seatType}
                        onClick={() => setSelectedSeatType(seatType)}
                      >
                        {explainSeatType(seatType).label}
                      </FilterButton>
                    ))}
                  </div>
                  {!visibleSeatTypes.length ? (
                    <p className="mt-2 text-sm text-slate-600">No seat types found in this group for this branch.</p>
                  ) : null}
                </div>
              </section>

              <details className="surface-card p-4">
                <summary className="focus-ring cursor-pointer font-semibold text-action">Compare available branches at a glance</summary>
                <p className="mt-2 text-sm text-slate-600">Latest available intake and cutoff are shown for orientation. Choose a branch above for category-wise records.</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {branches.map((branch) => {
                    const latestCutoff = branch.cutoffRows[0];
                    return (
                      <button
                        key={branch.branchCode}
                        className={`focus-ring min-w-0 rounded border p-3 text-left ${selectedBranch.branchCode === branch.branchCode ? "border-action bg-panel" : "border-line"}`}
                        type="button"
                        onClick={() => chooseBranch(branch.branchCode)}
                      >
                        <span className="block break-words text-sm font-semibold text-ink">{branch.branchName}</span>
                        <span className="mt-2 block text-xs text-slate-600">
                          {hasValue(branch.latestIntake) ? `${admissionRoute === "DSE" ? "Lateral seats" : "Intake"}: ${branch.latestIntake}` : "Intake unavailable"}
                        </span>
                        <span className="mt-1 block text-xs text-slate-600">
                          {latestCutoff ? `Latest listed cutoff: ${latestCutoff.closingScore}` : "Cutoff unavailable"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </details>

              {selectedSeatType !== "ALL" ? (
                <section className="surface-card p-4">
                  <h3 className="font-semibold text-ink">Cutoff trend for {selectedSeatType}</h3>
                  <p className="mt-1 text-sm text-slate-600">The latest available CAP round from each year is compared.</p>
                  {trendData.length >= 2 ? (
                    <div className="mt-4 h-64 w-full" aria-label={`Cutoff trend for ${selectedSeatType}`}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendData} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
                          <CartesianGrid stroke="#dce3eb" strokeDasharray="3 3" />
                          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                          <YAxis domain={["dataMin - 2", "dataMax + 2"]} tick={{ fontSize: 12 }} width={42} />
                          <Tooltip formatter={(value, _name, item) => [`${Number(value).toFixed(2)} (CAP ${item.payload.round})`, "Cutoff"]} />
                          <Line type="monotone" dataKey="cutoff" stroke="#14748d" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-slate-600">At least two years are needed to draw a reliable trend.</p>
                  )}
                </section>
              ) : null}

              <section className="surface-card p-4">
                <h3 className="font-semibold text-ink">Seat availability by year</h3>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {seatRows.map((row) => (
                    <article key={`${row.academicYear}-${row.branchCode}`} className="rounded border border-line p-3">
                      <p className="font-semibold text-ink">{row.academicYear}</p>
                      <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
                        {hasValue(row.sanctionedIntake) ? (
                          <InfoBox label="Approved intake" value={row.sanctionedIntake} />
                        ) : null}
                        {hasValue(row.lateralEntrySeats) ? (
                          <InfoBox label="DSE lateral-entry seats" value={row.lateralEntrySeats} />
                        ) : null}
                        {hasValue(row.vacantSeats) ? (
                          <InfoBox label="Previous-intake vacancies" value={row.vacantSeats} />
                        ) : null}
                        {hasValue(row.capSeats) ? <InfoBox label="CAP seats" value={row.capSeats} /> : null}
                        {hasValue(row.ewsSeats) ? <InfoBox label="EWS seats" value={row.ewsSeats} /> : null}
                      </dl>
                    </article>
                  ))}

                  {!seatRows.length ? (
                    <p className="text-sm text-slate-600">No seat matrix data found for this branch/year.</p>
                  ) : null}
                </div>
              </section>

              <section className="surface-card p-4">
                <h3 className="font-semibold text-ink">Cutoff history</h3>
                <div className="mt-3 grid gap-2">
                  {cutoffRows.slice(0, 80).map((row) => (
                    <article
                      key={row.id}
                      className="grid gap-2 rounded border border-line p-3 text-sm md:grid-cols-[90px_90px_minmax(180px,1fr)_100px_auto]"
                    >
                      <div>
                        <p className="text-xs text-slate-500">Year</p>
                        <p className="font-semibold">{row.academicYear}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Round</p>
                        <p className="font-semibold">CAP {row.capRound}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Seat type</p>
                        <SeatTypeText code={row.seatType} />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Cutoff</p>
                        <p className="font-semibold">{row.closingScore}</p>
                      </div>
                      {hasValue(row.closingRank) ? (
                        <div>
                          <p className="text-xs text-slate-500">Closing rank</p>
                          <p className="font-semibold">{row.closingRank}</p>
                        </div>
                      ) : null}
                    </article>
                  ))}

                  {!cutoffRows.length ? (
                    <p className="text-sm text-slate-600">No cutoff records found for this branch/year.</p>
                  ) : null}
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
