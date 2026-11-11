const tones = {
  green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  red: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  blue: 'bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300',
  slate: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300',
};

export default function Badge({ tone = 'slate', children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wide ${tones[tone] || tones.slate} ${className}`}
    >
      {children}
    </span>
  );
}

export function MethodBadge({ method }) {
  const map = { GET: 'green', POST: 'blue', PUT: 'amber', PATCH: 'purple', DELETE: 'red' };
  return <Badge tone={map[method] || 'slate'}>{method}</Badge>;
}

export function StatusBadge({ status }) {
  const s = Number(status);
  if (!s) return <Badge tone="slate">{status ?? '—'}</Badge>;
  if (s < 300) return <Badge tone="green">{s}</Badge>;
  if (s < 400) return <Badge tone="blue">{s}</Badge>;
  if (s < 500) return <Badge tone="amber">{s}</Badge>;
  return <Badge tone="red">{s}</Badge>;
}
