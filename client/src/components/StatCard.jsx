import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { formatNumber } from '../utils/format.js';

export default function StatCard({ label, value, delta, deltaLabel, icon: Icon, tone = 'brand' }) {
  const tones = {
    brand: 'bg-brand-600/10 text-brand-600 dark:text-brand-300',
    green: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    red: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    slate: 'bg-slate-500/10 text-slate-600 dark:text-slate-300',
  };
  // 0% is neutral — don't show it as a green "improvement".
  const up = typeof delta === 'number' ? (delta > 0 ? true : delta < 0 ? false : undefined) : undefined;
  return (
    <div className="card card-hover p-5 transition">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
        {Icon && (
          <span className={`rounded-lg p-2 ${tones[tone] || tones.brand}`}>
            <Icon size={18} />
          </span>
        )}
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
        {typeof value === 'number' ? formatNumber(value) : value ?? '—'}
      </p>
      {(delta !== undefined || deltaLabel) && (
        <p className="mt-1.5 flex items-center gap-1 text-xs">
          {up !== undefined && (
            <span
              className={`inline-flex items-center gap-0.5 font-semibold ${up ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
            >
              {up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {Math.abs(delta)}%
            </span>
          )}
          {deltaLabel && <span className="text-slate-500 dark:text-slate-400">{deltaLabel}</span>}
        </p>
      )}
    </div>
  );
}
