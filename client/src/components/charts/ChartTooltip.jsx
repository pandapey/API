/**
 * Shared recharts tooltip — glass card style used across Dashboard/Analytics.
 * Pass to a chart as: <Tooltip content={<ChartTooltip suffix="" />} />
 */
export function ChartTooltip({ active, payload, label, suffix = '' }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-[168px] rounded-2xl border border-white/40 bg-white/90 px-3.5 py-3 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/90">
      {label != null && label !== '' && (
        <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{label}</p>
      )}
      <div className="space-y-1.5">
        {payload.map((p) => (
          <div key={p.dataKey || p.name} className="flex items-center gap-2 text-xs">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full shadow-sm ring-2 ring-white/60 dark:ring-black/30"
              style={{ background: p.color || p.payload?.fill || p.stroke || '#6366f1' }}
            />
            <span className="font-medium text-slate-500 dark:text-slate-400">{p.name}</span>
            <span className="ml-auto pl-4 font-extrabold tabular-nums text-slate-900 dark:text-white">
              {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}{suffix}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Truncate long axis labels (endpoints/paths) for readability. */
export function trunc(s, n = 22) {
  const t = String(s ?? '');
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}
