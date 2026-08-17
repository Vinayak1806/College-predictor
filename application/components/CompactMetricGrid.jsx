const toneClasses = {
  action: "bg-cyan-50 text-action",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-red-50 text-danger",
  indigo: "bg-indigo-50 text-indigo-600",
  slate: "bg-slate-100 text-slate-600"
};

export function CompactMetricGrid({ items, className = "grid-cols-2 sm:grid-cols-4", vertical = false }) {
  return (
    <dl className={`grid gap-2 sm:gap-3 ${className}`}>
      {items.map(({ label, value, note, icon: Icon, tone = "action", valueClassName = "text-ink" }) => {
        if (vertical) {
          return (
            <div
              key={label}
              className="flex min-w-0 flex-col items-center justify-center gap-2 rounded-lg border border-line bg-white/90 p-3 text-center shadow-sm transition-all hover:shadow"
            >
              {Icon ? (
                <span className={`flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-md ${toneClasses[tone] || toneClasses.action}`}>
                  <Icon aria-hidden="true" size={17} strokeWidth={2} />
                </span>
              ) : null}
              <div className="flex min-w-0 flex-col items-center w-full">
                <dd className={`text-base font-bold leading-5 sm:text-lg ${valueClassName}`}>{value}</dd>
                <dt className="mt-1 text-[10px] font-medium leading-3.5 text-slate-500 sm:text-[11px]">{label}</dt>
                {note ? <dd className="mt-0.5 text-[9px] leading-3 text-slate-400">{note}</dd> : null}
              </div>
            </div>
          );
        }

        return (
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
              <dt className="order-2 mt-0.5 text-[11px] font-medium leading-4 text-slate-500 sm:text-xs">{label}</dt>
              <dd className={`order-1 text-lg font-bold leading-5 sm:text-xl ${valueClassName}`}>{value}</dd>
              {note ? <dd className="order-3 mt-0.5 text-[10px] leading-4 text-slate-400">{note}</dd> : null}
            </div>
          </div>
        );
      })}
    </dl>
  );
}
