import EmptyState from './EmptyState.jsx';
import { SkeletonTable } from './Skeleton.jsx';

export default function Table({ columns = [], data = [], loading = false, emptyTitle, emptyHint, keyField = 'id', onRowClick, emptyAction }) {
  if (loading) {
    return <SkeletonTable rows={4} />;
  }
  if (!data.length) {
    return <EmptyState title={emptyTitle || 'No records yet'} hint={emptyHint || 'When data arrives it will show up here.'} action={emptyAction} />;
  }
  return (
    <div className="card overflow-x-auto !rounded-2xl !p-0">
      <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" className="table-head px-4 py-3">
                {c.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
          {data.map((row, i) => {
            const key = row?.[keyField] ?? row?._id ?? row?.id ?? i;
            const clickable = !!onRowClick;
            return (
              <tr
                key={String(key)}
                onClick={() => onRowClick?.(row)}
                onKeyDown={(e) => {
                  if (!clickable) return;
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onRowClick?.(row);
                  }
                }}
                tabIndex={clickable ? 0 : undefined}
                role={clickable ? 'button' : undefined}
                aria-label={clickable ? `Open ${String(row?.name || row?.email || row?.path || key)}` : undefined}
                className={`transition-colors ${clickable ? 'cursor-pointer hover:bg-brand-50/60 focus-visible:bg-brand-50/60 dark:hover:bg-brand-950/20' : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'}`}
              >
                {columns.map((c) => (
                  <td key={c.key} className="whitespace-nowrap px-4 py-3 text-slate-700 dark:text-slate-200">
                    {c.render ? c.render(row) : row[c.key]}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
