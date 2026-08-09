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

const accuracyColors = ["#18758f", "#16a34a", "#dbe4ea"];
const coverageColors = ["#18758f", "#d97706", "#16a34a", "#7c3aed"];

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
    <div className="rounded border border-line bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-ink">Academic year {entry.name}</p>
      <p className="mt-1 text-slate-600"><strong className="text-ink">{Number(entry.value).toLocaleString("en-IN")}</strong> verified records</p>
    </div>
  );
}

function AccuracyTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];

  return (
    <div className="rounded border border-line bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-ink">{entry.name}</p>
      <p className="mt-1 text-slate-600"><strong className="text-ink">{Number(entry.value).toFixed(1)}%</strong> of tested options</p>
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
    <section className="border-b border-line bg-[#f5f8fa]" aria-labelledby="evidence-heading">
      <div className="mx-auto max-w-7xl px-4 py-8 md:py-10">
        <div className="grid gap-4 md:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] md:items-end">
          <div>
            <p className="text-xs font-semibold uppercase text-action">Prediction reliability</p>
            <h2 id="evidence-heading" className="mt-2 text-3xl font-bold text-ink">How reliable are our predictions?</h2>
          </div>
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            We trained the prediction logic on earlier cutoff years, then checked how well its admission zones matched the unseen 2025-26 records.
          </p>
        </div>

        <div className="mt-5 flex items-start gap-3 border-l-4 border-success bg-emerald-50 px-4 py-2.5 text-sm leading-6 text-slate-700">
          <strong className="shrink-0 text-success">Key result</strong>
          <p>88.4% of FE and 92.2% of DSE options stayed in the same or neighboring admission zone.</p>
        </div>

        <div className="mt-3 grid overflow-hidden rounded border border-line bg-white lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
          <article className="min-w-0 border-b border-line p-4 lg:border-b-0 lg:border-r">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Data coverage</p>
                <h3 className="mt-1 text-lg font-semibold text-ink">Official cutoffs by year</h3>
              </div>
              <p className="text-xs text-slate-500">First-Year and Direct Second-Year</p>
            </div>
            <div className="grid items-center gap-3 sm:grid-cols-[220px_minmax(0,1fr)] lg:grid-cols-1 xl:grid-cols-[220px_minmax(0,1fr)]">
              <div className="relative mx-auto h-52 w-full max-w-[220px]" role="img" aria-label="Donut chart showing verified cutoff records by academic year">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={coveragePieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={58}
                      outerRadius={84}
                      paddingAngle={2}
                      startAngle={90}
                      endAngle={-270}
                      stroke="none"
                    >
                      {coveragePieData.map((item, index) => (
                        <Cell key={item.academicYear} fill={coverageColors[index % coverageColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CoverageTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                  <strong className="text-xl text-ink">{coverageTotal.toLocaleString("en-IN")}</strong>
                  <span className="mt-1 text-[11px] text-slate-500">verified records</span>
                </div>
              </div>
              <dl className="divide-y divide-line border-y border-line text-xs">
                {coveragePieData.map((item, index) => (
                  <div key={item.academicYear} className="py-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <dt className="inline-flex items-center gap-2 font-semibold text-ink">
                        <span className="h-2.5 w-2.5" style={{ backgroundColor: coverageColors[index % coverageColors.length] }} />
                        {item.academicYear}
                      </dt>
                      <dd className="font-semibold text-ink">{item.value.toLocaleString("en-IN")}</dd>
                    </div>
                    <p className="mt-1 pl-[18px] text-slate-500">FE {item.FE.toLocaleString("en-IN")} | DSE {item.DSE.toLocaleString("en-IN")}</p>
                  </div>
                ))}
              </dl>
            </div>
          </article>

          <article className="min-w-0 p-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Previous-cutoff test</p>
                <h3 className="mt-1 text-lg font-semibold text-ink">How closely the zones matched</h3>
              </div>
              <p className="text-xs text-slate-500">Checked against 2025-26</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 border-y border-line py-2.5 text-xs text-slate-600" aria-label="Accuracy chart legend">
              {["Exact zone", "Neighboring zone only", "Moved beyond one zone"].map((label, index) => (
                <span key={label} className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5" style={{ backgroundColor: accuracyColors[index] }} /> {label}
                </span>
              ))}
            </div>
            <div className="grid sm:grid-cols-2">
              {backtestData.map((item) => (
                <div key={item.route} className="min-w-0 py-3 sm:px-3 sm:first:border-r sm:first:border-line">
                  <div className="relative mx-auto h-36 max-w-[180px]" role="img" aria-label={`${item.route} historical accuracy: ${item.exact}% exact zone and ${item.nearby}% within one zone`}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={accuracySegments(item)}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={42}
                          outerRadius={60}
                          paddingAngle={2}
                          startAngle={90}
                          endAngle={-270}
                          stroke="none"
                        >
                          {accuracySegments(item).map((segment, index) => (
                            <Cell key={segment.name} fill={accuracyColors[index]} />
                          ))}
                        </Pie>
                        <Tooltip content={<AccuracyTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-xs font-semibold uppercase text-slate-500">{item.route}</span>
                      <strong className="mt-1 text-xl text-ink">{item.exact}%</strong>
                      <span className="text-[11px] text-slate-500">exact zone</span>
                    </div>
                  </div>
                  <dl className="grid grid-cols-2 gap-2 text-center text-xs">
                    <div>
                      <dt className="font-semibold text-ink">{item.nearby}%</dt>
                      <dd className="mt-0.5 text-slate-500">within one zone</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-ink">{item.tested.toLocaleString("en-IN")}</dt>
                      <dd className="mt-0.5 text-slate-500">options tested</dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
            <details className="border-t border-line pt-3 text-xs text-slate-600">
              <summary className="focus-ring cursor-pointer font-semibold text-action">What does the cutoff error mean?</summary>
              <p className="mt-2 leading-5">The average difference was 3.40 percentile points for FE and 4.49 diploma-percentage points for DSE. Results with limited or volatile history are shown with lower confidence.</p>
            </details>
          </article>
        </div>

        <p className="mt-3 text-xs leading-5 text-slate-500">
          This checks historical cutoff behavior, not individual student allotments. A prediction cannot guarantee admission in a future CAP round.
        </p>
      </div>
    </section>
  );
}
