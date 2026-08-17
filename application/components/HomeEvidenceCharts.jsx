"use client";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip
} from "recharts";

const backtestData = [
  { route: "FE", exact: 66.3, nearby: 88.4, tested: 3858, error: 3.4, unit: "percentile points" },
  { route: "DSE", exact: 63.6, nearby: 92.2, tested: 7599, error: 4.49, unit: "percentage points" }
];

const accuracyColors = ["#4f46e5", "#10b981", "#cbd5e1"];
const coverageColors = ["#4f46e5", "#0891b2", "#10b981", "#8b5cf6"];

function accuracySegments(item) {
  return [
    { name: "Exact zone", value: item.exact },
    { name: "Neighboring zone only", value: Number((item.nearby - item.exact).toFixed(1)) },
    { name: "Moved beyond one zone", value: Number((100 - item.nearby).toFixed(1)) }
  ];
}

function CoverageTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];

  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 backdrop-blur-md px-3.5 py-2 text-xs shadow-xl ring-1 ring-slate-900/5">
      <p className="font-bold text-slate-900">Academic year {entry.name}</p>
      <p className="mt-0.5 text-slate-600"><strong className="text-indigo-600 font-extrabold">{Number(entry.value).toLocaleString("en-IN")}</strong> verified records</p>
    </div>
  );
}

function AccuracyTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];

  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 backdrop-blur-md px-3.5 py-2 text-xs shadow-xl ring-1 ring-slate-900/5">
      <p className="font-bold text-slate-900">{entry.name}</p>
      <p className="mt-0.5 text-slate-600"><strong className="text-indigo-600 font-extrabold">{Number(entry.value).toFixed(1)}%</strong> of tested options</p>
    </div>
  );
}

export function HomeEvidenceCharts({ coverage = [] }) {
  const coveragePieData = coverage.map((item) => ({
    ...item,
    name: item.academicYear,
    value: item.FE + item.DSE
  }));
  const coverageTotal = coveragePieData.reduce((sum, item) => sum + item.value, 0);

  return (
    <section className="border-b border-slate-200 bg-slate-50/50" aria-labelledby="evidence-heading">
      <div className="mx-auto max-w-7xl px-4 py-10 md:py-14">
        <div className="grid gap-4 md:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] md:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Prediction reliability</p>
            <h2 id="evidence-heading" className="mt-2 text-3xl font-bold tracking-tight text-slate-900">How reliable are our predictions?</h2>
          </div>
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            We trained the prediction logic on earlier cutoff years, then checked how well its admission zones matched the unseen 2025-26 records.
          </p>
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-lg border border-emerald-200/80 bg-emerald-50/80 px-4 py-3 text-sm leading-6 text-slate-700">
          <strong className="shrink-0 text-emerald-700">Key result:</strong>
          <p>88.4% of FE and 92.2% of DSE options stayed in the same or neighboring admission zone.</p>
        </div>

        <div className="surface-card mt-6 grid overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:grid-cols-12">
          {/* Left panel: Data coverage */}
          <article className="min-w-0 p-6 lg:col-span-5 border-b border-slate-200 lg:border-b-0 lg:border-r">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Data coverage</p>
                <h3 className="mt-1 text-lg font-bold text-slate-900">Official cutoffs by year</h3>
              </div>
              <span className="tag tag-action">FE & DSE</span>
            </div>

            <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row sm:items-center">
              <div className="relative h-44 w-44 shrink-0" role="img" aria-label="Donut chart showing verified cutoff records by academic year">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={coveragePieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={72}
                      paddingAngle={3}
                      startAngle={90}
                      endAngle={-270}
                      stroke="none"
                    >
                      {coveragePieData.map((item, index) => (
                        <Cell key={item.academicYear} fill={coverageColors[index % coverageColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CoverageTooltip />} wrapperStyle={{ pointerEvents: "none", zIndex: 50 }} position={{ y: -45 }} allowEscapeViewBox={{ x: true, y: true }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                  <strong className="text-lg font-bold text-slate-900 leading-none">{coverageTotal.toLocaleString("en-IN")}</strong>
                  <span className="mt-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">verified</span>
                </div>
              </div>

              <dl className="w-full flex-1 divide-y divide-slate-100 border-y border-slate-100 text-xs">
                {coveragePieData.map((item, index) => (
                  <div key={item.academicYear} className="py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <dt className="inline-flex items-center gap-2 font-semibold text-slate-900">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: coverageColors[index % coverageColors.length] }} />
                        {item.academicYear}
                      </dt>
                      <dd className="font-bold text-slate-900">{item.value.toLocaleString("en-IN")}</dd>
                    </div>
                    <p className="mt-0.5 pl-4 text-[11px] text-slate-500">FE {item.FE.toLocaleString("en-IN")} | DSE {item.DSE.toLocaleString("en-IN")}</p>
                  </div>
                ))}
              </dl>
            </div>
          </article>

          {/* Right panel: Previous cutoff test */}
          <article className="min-w-0 p-6 lg:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Previous-cutoff test</p>
                <h3 className="mt-1 text-lg font-bold text-slate-900">How closely the zones matched</h3>
              </div>
              <span className="text-xs font-medium text-slate-500">Checked against 2025-26</span>
            </div>

            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 rounded-lg bg-slate-50 px-3.5 py-2 text-xs text-slate-600" aria-label="Accuracy chart legend">
              {["Exact zone", "Neighboring zone only", "Moved beyond one zone"].map((label, index) => (
                <span key={label} className="inline-flex items-center gap-1.5 font-medium">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: accuracyColors[index] }} /> {label}
                </span>
              ))}
            </div>

            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              {backtestData.map((item) => (
                <div key={item.route} className="flex flex-col items-center rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                  <div className="relative h-36 w-36" role="img" aria-label={`${item.route} historical accuracy: ${item.exact}% exact zone and ${item.nearby}% within one zone`}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={accuracySegments(item)}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={40}
                          outerRadius={60}
                          paddingAngle={3}
                          startAngle={90}
                          endAngle={-270}
                          stroke="none"
                        >
                          {accuracySegments(item).map((segment, index) => (
                            <Cell key={segment.name} fill={accuracyColors[index]} />
                          ))}
                        </Pie>
                        <Tooltip content={<AccuracyTooltip />} wrapperStyle={{ pointerEvents: "none", zIndex: 50 }} position={{ y: -50 }} allowEscapeViewBox={{ x: true, y: true }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">{item.route}</span>
                      <strong className="mt-0.5 text-lg font-bold text-slate-900 leading-none">{item.exact}%</strong>
                      <span className="mt-0.5 text-[10px] text-slate-500">exact zone</span>
                    </div>
                  </div>
                  <dl className="mt-4 grid w-full grid-cols-2 gap-2 border-t border-slate-200/80 pt-3 text-center text-xs">
                    <div>
                      <dt className="font-bold text-slate-900">{item.nearby}%</dt>
                      <dd className="mt-0.5 text-[11px] text-slate-500">within 1 zone</dd>
                    </div>
                    <div>
                      <dt className="font-bold text-slate-900">{item.tested.toLocaleString("en-IN")}</dt>
                      <dd className="mt-0.5 text-[11px] text-slate-500">tested</dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>

            <details className="mt-6 border-t border-slate-100 pt-3 text-xs text-slate-600">
              <summary className="focus-ring cursor-pointer font-semibold text-indigo-600 hover:text-indigo-700">What does the cutoff error mean?</summary>
              <p className="mt-2 leading-5 text-slate-500">The average difference was 3.40 percentile points for FE and 4.49 diploma-percentage points for DSE. Results with limited or volatile history are shown with lower confidence.</p>
            </details>
          </article>
        </div>

        <p className="mt-4 text-xs leading-5 text-slate-400">
          This checks historical cutoff behavior, not individual student allotments. A prediction cannot guarantee admission in a future CAP round.
        </p>
      </div>
    </section>
  );
}
