import { Inbox, RefreshCw, TriangleAlert } from 'lucide-react';

export default function EmptyState({ title = 'Nothing here yet', hint, action, icon: Icon = Inbox }) {
  return (
    <div className="fade-up flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-gradient-to-b from-slate-50/80 to-transparent px-6 py-12 text-center dark:border-slate-700 dark:from-slate-800/40">
      <span className="gradient-border flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500/15 to-violet-500/15 text-brand-600 dark:text-brand-300">
        <Icon size={22} />
      </span>
      <h3 className="mt-4 font-semibold tracking-tight text-slate-900 dark:text-white">{title}</h3>
      {hint && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-slate-500 dark:text-slate-400">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message = 'Failed to load', onRetry }) {
  return (
    <div className="fade-up flex flex-col items-center justify-center rounded-2xl border border-rose-200 bg-gradient-to-b from-rose-50 to-transparent px-6 py-10 text-center dark:border-rose-900/60 dark:from-rose-950/40 dark:to-transparent" role="alert">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300">
        <TriangleAlert size={20} />
      </span>
      <p className="mt-3 max-w-md font-semibold text-rose-700 dark:text-rose-300">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary mt-4 !gap-1.5">
          <RefreshCw size={14} /> Retry
        </button>
      )}
    </div>
  );
}
