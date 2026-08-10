const toneClasses = {
  action: "bg-cyan-50 text-action",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-red-50 text-danger",
  indigo: "bg-indigo-50 text-indigo-600",
  slate: "bg-slate-100 text-slate-600"
};

export function CompactMetricGrid({ items, className = "grid-cols-2 sm:grid-cols-4" }) {
  return (
    <dl className={`grid gap-2 sm:gap-3 ${className}`}>
      {items.map(({ label, value, note, icon: Icon, tone = "action", valueClassName = "text-ink" }) => (
        <div
          key={label}
          className="flex min-w-0 items-center justify-center gap-2 rounded-lg border border-line bg-white/90 px-2 py-3 shadow-sm sm:justify-start sm:gap-3 sm:px-3"
        >
          {Icon ? (
            <span className={`hidden h-9 w-9 shrink-0 items-center justify-center rounded-md sm:flex ${toneClasses[tone] || toneClasses.action}`}>
              <Icon aria-hidden="true" size={18} strokeWidth={2} />
            </span>
          ) : null}
          <div className="flex min-w-0 flex-col text-center sm:text-left">
            <dt className="order-2 mt-0.5 truncate text-[11px] font-medium leading-4 text-slate-500 sm:text-xs">{label}</dt>
            <dd className={`order-1 text-lg font-bold leading-5 sm:text-xl ${valueClassName}`}>{value}</dd>
            {note ? <dd className="order-3 mt-0.5 truncate text-[10px] leading-4 text-slate-400">{note}</dd> : null}
          </div>
        </div>
      ))}
    </dl>
  );
}
