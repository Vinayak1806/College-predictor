"use client";

import Link from "next/link";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  FileDown,
  GripVertical,
  ListFilter,
  ListOrdered,
  Plus,
  Trash2
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  addPreferenceItem,
  movePreferenceItem,
  organizePreferenceItems,
  preferenceItemId,
  preferenceListWarnings,
  preferenceZones,
  readPreferenceList,
  writePreferenceList
} from "../lib/preferenceList";
import { CollegeAutocomplete } from "./CollegeAutocomplete";

const zoneStyles = {
  AMBITIOUS: "border-warning bg-amber-50 text-warning",
  TARGET: "border-action bg-cyan-50 text-action",
  SAFE: "border-success bg-emerald-50 text-success",
  BACKUP: "border-slate-400 bg-slate-50 text-slate-700"
};

function formatNumber(value) {
  return Number(value).toFixed(2);
}

export function PreferenceListBuilder() {
  const [items, setItems] = useState([]);
  const [ready, setReady] = useState(false);
  const [selectedCollege, setSelectedCollege] = useState(null);
  const [branches, setBranches] = useState([]);
  const [selectedBranchCode, setSelectedBranchCode] = useState("");
  const [selectedZone, setSelectedZone] = useState("TARGET");
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [notice, setNotice] = useState("");
  const [draggedIndex, setDraggedIndex] = useState(null);

  useEffect(() => {
    setItems(readPreferenceList());
    setReady(true);

    function syncPreferenceList(event) {
      setItems(Array.isArray(event.detail) ? event.detail : readPreferenceList());
    }

    window.addEventListener("cap-preference-list-updated", syncPreferenceList);
    return () => window.removeEventListener("cap-preference-list-updated", syncPreferenceList);
  }, []);

  useEffect(() => {
    if (ready) writePreferenceList(items);
  }, [items, ready]);

  const counts = useMemo(() => (
    preferenceZones.reduce((result, zone) => {
      result[zone.value] = items.filter((item) => item.zone === zone.value).length;
      return result;
    }, {})
  ), [items]);

  const guidance = useMemo(() => {
    const messages = [];
    if (items.length > 0 && items.length < 10) messages.push("Add more choices so one unexpected cutoff does not leave the list too short.");
    if (items.length > 0 && !counts.SAFE) messages.push("No Safe choice is included yet.");
    if (items.length > 0 && !counts.BACKUP) messages.push("Add at least one Backup choice before final submission.");
    messages.push(...preferenceListWarnings(items));
    return messages;
  }, [counts, items.length]);

  async function selectCollege(college) {
    setSelectedCollege(college);
    setBranches([]);
    setSelectedBranchCode("");
    setNotice("");
    setLoadingBranches(true);

    try {
      const response = await fetch(`/api/colleges/${college.slug}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load branches.");

      const latestBranches = [...new Map(
        (data.collegeBranches || []).map((collegeBranch) => [
          collegeBranch.branch.branchCode,
          {
            code: collegeBranch.branch.branchCode,
            name: collegeBranch.branch.displayName || collegeBranch.branch.officialName
          }
        ])
      ).values()].sort((a, b) => a.name.localeCompare(b.name));

      setBranches(latestBranches);
      if (latestBranches.length) setSelectedBranchCode(latestBranches[0].code);
      if (!latestBranches.length) setNotice("No current branch records were found for this college.");
    } catch (error) {
      setNotice(error.message || "Could not load branches for this college.");
    } finally {
      setLoadingBranches(false);
    }
  }

  function addManualChoice() {
    const branch = branches.find((item) => item.code === selectedBranchCode);
    if (!selectedCollege || !branch) {
      setNotice("Select a college and branch before adding the choice.");
      return;
    }

    const item = {
      id: preferenceItemId(selectedCollege.instituteCode, branch.code),
      instituteCode: selectedCollege.instituteCode,
      collegeSlug: selectedCollege.slug,
      college: selectedCollege.name,
      branchCode: branch.code,
      branch: branch.name,
      city: selectedCollege.city?.name || "",
      zone: selectedZone,
      cutoff: null,
      margin: null,
      seatType: "",
      year: "",
      round: null,
      source: "MANUAL",
      addedAt: new Date().toISOString()
    };
    const result = addPreferenceItem(items, item);

    if (!result.added) {
      setNotice("This college and branch is already in your CAP list.");
      return;
    }

    setItems(result.items);
    setNotice(`${branch.name} added at preference ${result.items.length}.`);
  }

  function updateItemZone(itemId, zone) {
    setItems((current) => current.map((item) => item.id === itemId ? { ...item, zone } : item));
  }

  function removeItem(itemId) {
    setItems((current) => current.filter((item) => item.id !== itemId));
    setNotice("Choice removed.");
  }

  function moveItem(fromIndex, toIndex) {
    setItems((current) => movePreferenceItem(current, fromIndex, toIndex));
  }

  function clearList() {
    if (!window.confirm("Remove every choice from this CAP preference list?")) return;
    setItems([]);
    setNotice("Preference list cleared.");
  }

  function organizeByRisk() {
    setItems((current) => organizePreferenceItems(current));
    setNotice("Choices grouped as Ambitious, Target, Safe and Backup. Choices inside each group kept their previous order.");
  }

  return (
    <div className="preference-list-page">
      <section className="overflow-visible rounded-lg border border-line bg-white">
        <div className="border-b border-line px-4 py-4 md:px-5">
          <p className="text-xs font-semibold uppercase text-action">Add a college-branch choice</p>
          <p className="mt-1 text-sm text-slate-600">
            Search by current institute name or code, then choose the exact branch.
          </p>
        </div>
        <div className="preference-builder-controls grid gap-3 p-4 md:grid-cols-[minmax(0,1.5fr)_minmax(180px,1fr)_150px_auto] md:items-end md:p-5">
          <div className="grid gap-2">
            <label className="text-sm font-medium text-ink">College</label>
            <CollegeAutocomplete
              className="focus-within:ring-2 focus-within:ring-[#7db9ca] rounded border border-line px-3"
              placeholder="Type college name or code"
              selectionMode="fill"
              showIcon
              onSelect={selectCollege}
            />
          </div>
          <label className="grid gap-2 text-sm font-medium text-ink">
            Branch
            <select
              className="focus-ring min-h-11 min-w-0 rounded border border-line bg-white px-3"
              disabled={!selectedCollege || loadingBranches || !branches.length}
              value={selectedBranchCode}
              onChange={(event) => setSelectedBranchCode(event.target.value)}
            >
              <option value="">{loadingBranches ? "Loading branches..." : "Select branch"}</option>
              {branches.map((branch) => <option key={branch.code} value={branch.code}>{branch.name}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium text-ink">
            Category
            <select
              className="focus-ring min-h-11 rounded border border-line bg-white px-3"
              value={selectedZone}
              onChange={(event) => setSelectedZone(event.target.value)}
            >
              {preferenceZones.map((zone) => <option key={zone.value} value={zone.value}>{zone.label}</option>)}
            </select>
          </label>
          <button
            className="focus-ring flex min-h-11 items-center justify-center gap-2 rounded bg-action px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            disabled={!selectedCollege || !selectedBranchCode || loadingBranches}
            onClick={addManualChoice}
          >
            <Plus aria-hidden="true" size={18} /> Add
          </button>
        </div>
        {notice ? (
          <div className="flex items-start gap-2 border-t border-line bg-panel px-4 py-3 text-sm text-slate-700 md:px-5" role="status">
            <CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0 text-action" size={17} />
            <p>{notice}</p>
          </div>
        ) : null}
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <section className="min-w-0 overflow-hidden rounded-lg border border-line bg-white">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line p-4 md:px-5">
            <div>
              <p className="text-xs font-semibold uppercase text-action">Your ordered choices</p>
              <h2 className="mt-1 text-lg font-semibold text-ink">{items.length} preferences</h2>
            </div>
            <p className="text-xs text-slate-500">Higher position means higher CAP priority.</p>
          </div>

          {!ready ? <p className="p-6 text-center text-sm text-slate-500">Loading saved choices...</p> : null}
          {ready && !items.length ? (
            <div className="px-5 py-12 text-center">
              <ListOrdered aria-hidden="true" className="mx-auto text-slate-400" size={28} />
              <p className="mt-3 font-semibold text-ink">Your CAP list is empty</p>
              <p className="mt-1 text-sm text-slate-500">Add choices here or from FE prediction results.</p>
              <Link className="focus-ring mt-4 inline-flex min-h-11 items-center rounded bg-action px-4 text-sm font-semibold text-white" href="/fe-predictor">
                Open FE Predictor
              </Link>
            </div>
          ) : null}

          {items.length ? (
            <ol className="divide-y divide-line">
              {items.map((item, index) => (
                <li
                  key={item.id}
                  className={`grid min-w-0 gap-3 px-3 py-4 sm:grid-cols-[44px_minmax(0,1fr)] md:grid-cols-[44px_minmax(0,1fr)_150px_auto] md:items-center md:px-4 ${
                    draggedIndex === index ? "bg-cyan-50" : "bg-white"
                  }`}
                  draggable
                  onDragStart={() => setDraggedIndex(index)}
                  onDragEnd={() => setDraggedIndex(null)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    if (draggedIndex !== null) moveItem(draggedIndex, index);
                    setDraggedIndex(null);
                  }}
                >
                  <div className="flex h-11 w-11 items-center justify-center gap-1 rounded border border-line bg-panel font-semibold text-ink" title="Drag to reorder">
                    <GripVertical aria-hidden="true" size={16} className="text-slate-400" />
                    <span>{index + 1}</span>
                  </div>

                  <div className="min-w-0">
                    <Link className="font-semibold leading-6 text-ink hover:text-action hover:underline" href={`/colleges/${item.collegeSlug}`}>
                      {item.college}
                    </Link>
                    <p className="mt-1 text-sm font-medium text-action">{item.branch}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {[`Institute ${item.instituteCode}`, item.city].filter(Boolean).join(" | ")}
                    </p>
                    {item.cutoff !== null ? (
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Cutoff {formatNumber(item.cutoff)}
                        {item.margin !== null ? ` | Margin ${item.margin >= 0 ? "+" : ""}${formatNumber(item.margin)}` : ""}
                        {item.seatType ? ` | ${item.seatType}` : ""}
                      </p>
                    ) : null}
                  </div>

                  <select
                    aria-label={`Category for preference ${index + 1}`}
                    className={`focus-ring min-h-11 rounded border px-3 text-sm font-semibold ${zoneStyles[item.zone]}`}
                    value={item.zone}
                    onChange={(event) => updateItemZone(item.id, event.target.value)}
                  >
                    {preferenceZones.map((zone) => <option key={zone.value} value={zone.value}>{zone.label}</option>)}
                  </select>

                  <div className="preference-builder-controls flex items-center gap-1 sm:col-start-2 md:col-start-auto">
                    <button
                      aria-label={`Move preference ${index + 1} up`}
                      title="Move up"
                      className="focus-ring flex h-11 w-11 items-center justify-center rounded border border-line text-slate-600 disabled:opacity-30"
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveItem(index, index - 1)}
                    >
                      <ArrowUp aria-hidden="true" size={17} />
                    </button>
                    <button
                      aria-label={`Move preference ${index + 1} down`}
                      title="Move down"
                      className="focus-ring flex h-11 w-11 items-center justify-center rounded border border-line text-slate-600 disabled:opacity-30"
                      type="button"
                      disabled={index === items.length - 1}
                      onClick={() => moveItem(index, index + 1)}
                    >
                      <ArrowDown aria-hidden="true" size={17} />
                    </button>
                    <button
                      aria-label={`Remove preference ${index + 1}`}
                      title="Remove"
                      className="focus-ring flex h-11 w-11 items-center justify-center rounded border border-line text-danger hover:bg-red-50"
                      type="button"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 aria-hidden="true" size={17} />
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          ) : null}
        </section>

        <aside className="overflow-hidden rounded-lg border border-line bg-white lg:sticky lg:top-20">
          <div className="border-b border-line p-4">
            <p className="text-xs font-semibold uppercase text-action">List balance</p>
            <p className="mt-1 text-sm text-slate-600">Categories organize risk; your order controls CAP priority.</p>
          </div>
          <dl className="divide-y divide-line">
            {preferenceZones.map((zone) => (
              <div key={zone.value} className="flex items-center justify-between gap-3 px-4 py-3">
                <dt className={`rounded border px-2 py-1 text-xs font-semibold ${zoneStyles[zone.value]}`}>{zone.label}</dt>
                <dd className="font-semibold text-ink">{counts[zone.value] || 0}</dd>
              </div>
            ))}
          </dl>

          {guidance.length ? (
            <div className="border-t border-line bg-amber-50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-warning">
                <AlertCircle aria-hidden="true" size={17} /> Check before finalizing
              </div>
              <ul className="mt-2 grid gap-2 text-xs leading-5 text-slate-700">
                {guidance.map((message) => <li key={message}>{message}</li>)}
              </ul>
            </div>
          ) : null}

          <div className="preference-builder-controls grid gap-2 border-t border-line p-4">
            <button
              className="focus-ring flex min-h-11 items-center justify-center gap-2 rounded border border-action bg-white px-4 text-sm font-semibold text-action disabled:opacity-50"
              type="button"
              disabled={!items.length}
              onClick={organizeByRisk}
            >
              <ListFilter aria-hidden="true" size={17} /> Group by admission chance
            </button>
            <button
              className="focus-ring flex min-h-11 items-center justify-center gap-2 rounded bg-action px-4 text-sm font-semibold text-white disabled:opacity-50"
              type="button"
              disabled={!items.length}
              onClick={() => window.print()}
            >
              <FileDown aria-hidden="true" size={17} /> Print / Save PDF
            </button>
            <button
              className="focus-ring flex min-h-11 items-center justify-center gap-2 rounded border border-line px-4 text-sm font-semibold text-danger disabled:opacity-50"
              type="button"
              disabled={!items.length}
              onClick={clearList}
            >
              <Trash2 aria-hidden="true" size={17} /> Clear list
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
