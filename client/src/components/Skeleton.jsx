export default function Skeleton({ className = '' }) {
  return <div aria-hidden="true" className={`shimmer rounded-lg ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="card p-5" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="mt-3 h-8 w-1/2" />
      <Skeleton className="mt-2 h-3 w-2/3" />
    </div>
  );
}

export function SkeletonTable({ rows = 4 }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800" aria-busy="true" aria-label="Loading table">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 border-b border-slate-100 p-4 last:border-0 dark:border-slate-800">
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

/**
 * Lazy-page fallback used by the router-level Suspense boundaries.
 * Lives here so routes/index.jsx and Layout can share one implementation
 * without a circular import.
 */
export function RouteFallback() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10" aria-busy="true" aria-label="Loading page">
      <div className="space-y-3">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-40 w-full" />
      </div>
    </div>
  );
}
