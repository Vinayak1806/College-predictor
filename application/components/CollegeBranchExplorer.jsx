"use client";

import { useState } from "react";
import { explainSeatType, matchesSeatGroup, seatTypeGroups } from "../lib/seatTypes";

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

export function CollegeBranchExplorer({ branches, initialBranchName, initialYear, initialSeatType, admissionRoute = "FE" }) {
  const initialBranch = initialBranchName
    ? branches.find((branch) => branch.branchName.toLowerCase() === initialBranchName.toLowerCase())
    : null;
  const [selectedBranchCode, setSelectedBranchCode] = useState(initialBranch?.branchCode || branches[0]?.branchCode || "");
  const [selectedYear, setSelectedYear] = useState(initialYear || "ALL");
  const [selectedSeatGroup, setSelectedSeatGroup] = useState("ALL");
  const [selectedSeatType, setSelectedSeatType] = useState(initialSeatType || "ALL");

  const selectedBranch =
    branches.find((branch) => branch.branchCode === selectedBranchCode) ||
    branches[0] ||
    null;

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

      <div className="mt-3 grid gap-4 lg:grid-cols-[320px_1fr]">
        <aside className="rounded-lg border border-line bg-white p-3">
          <p className="text-sm font-semibold text-ink">Branches ({branches.length})</p>
          <div className="mt-3 grid max-h-[520px] gap-2 overflow-auto pr-1">
            {branches.map((branch) => (
              <button
                key={branch.branchCode}
                className={`focus-ring rounded border p-3 text-left text-sm ${
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

        <div className="grid gap-4">
          {!selectedBranch ? (
            <div className="rounded-lg border border-warning bg-white p-4 text-sm text-warning">
              No branch data found for this college.
            </div>
          ) : (
            <>
              <section className="rounded-lg border border-line bg-white p-4">
                <div>
                  <h3 className="text-lg font-semibold text-ink">{selectedBranch.branchName}</h3>
                  <p className="mt-1 text-sm text-slate-600">Branch code: {selectedBranch.branchCode}</p>
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
                  <div className="mt-2 flex max-h-44 flex-wrap gap-2 overflow-auto pr-1">
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

              <section className="rounded-lg border border-line bg-white p-4">
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

              <section className="rounded-lg border border-line bg-white p-4">
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
