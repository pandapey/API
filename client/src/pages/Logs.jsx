import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, RefreshCw } from 'lucide-react';
import { useLogs } from '../hooks/useLogs.js';
import { useProjects } from '../hooks/useProjects.js';
import { useSocket } from '../hooks/useSocket.js';
import { useToast } from '../context/ToastContext.jsx';
import { extractError } from '../services/api.js';
import { logService } from '../services/logService.js';
import Table from '../components/Table.jsx';
import { ErrorState } from '../components/EmptyState.jsx';
import { MethodBadge, StatusBadge } from '../components/Badge.jsx';
import { formatDate, formatMs } from '../utils/format.js';

export default function Logs() {
  const [sp, setSp] = useSearchParams();
  const toast = useToast();
  const [exporting, setExporting] = useState(false);
  const { projects } = useProjects();
  const { logs, meta, loading, error, filters, setFilters, refetch } = useLogs({
    projectId: sp.get('projectId') || '',
    status: sp.get('status') || '',
    endpoint: sp.get('endpoint') || '',
    from: sp.get('from') || '',
    to: sp.get('to') || '',
    page: Number(sp.get('page')) || 1,
  });

  // Live updates for the selected project's room. With "All projects" no room
  // is joined (scoped-by-design on the server) and the page stays manual.
  const { connected, lastEvent } = useSocket(['request:logged'], { projectId: filters.projectId });
  const lastLiveFetchRef = useRef(0);
  useEffect(() => {
    if (!lastEvent) return;
    const now = Date.now();
    if (now - lastLiveFetchRef.current < 2000) return; // throttle to 1 refresh / 2s
    lastLiveFetchRef.current = now;
    refetch();
  }, [lastEvent, refetch]);

  useEffect(() => {
    const next = {};
    if (filters.projectId) next.projectId = filters.projectId;
    if (filters.status) next.status = filters.status;
    if (filters.endpoint) next.endpoint = filters.endpoint;
    if (filters.from) next.from = filters.from;
    if (filters.to) next.to = filters.to;
    if (filters.page > 1) next.page = String(filters.page);
    setSp(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.projectId, filters.status, filters.endpoint, filters.from, filters.to, filters.page]);

  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v, page: k === 'page' ? v : 1 }));

  const onExport = async () => {
    setExporting(true);
    try {
      await logService.exportCsv({ ...filters, page: undefined, limit: undefined });
      toast.success('CSV exported');
    } catch (e) {
      toast.error(extractError(e, 'Export failed'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="page-enter space-y-4">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h1 className="page-title">Request logs</h1>
          <p className="page-subtitle flex items-center gap-2">
            Every gateway call — filter, inspect and export.
            {connected && filters.projectId && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400" title="Auto-refreshing as new requests land">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 motion-safe:animate-pulse" aria-hidden="true" /> Live
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={onExport} disabled={exporting} className="btn-secondary !py-1.5 !text-xs" aria-busy={exporting}>
            <Download size={14} /> {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
          <button onClick={() => refetch()} className="btn-secondary !py-1.5 !text-xs"><RefreshCw size={14} /> Refresh</button>
        </div>
      </div>
      {error && <ErrorState message={error} onRetry={() => refetch()} />}

      <div className="card grid gap-3 p-4 md:grid-cols-6">
        <select aria-label="Filter by project" value={filters.projectId} onChange={(e) => set('projectId', e.target.value)} className="input">
          <option value="">All projects</option>
          {projects.map((p) => <option key={p._id || p.id} value={p._id || p.id}>{p.name}</option>)}
        </select>
        <select aria-label="Filter by status" value={filters.status} onChange={(e) => set('status', e.target.value)} className="input">
          <option value="">Any status</option>
          <option value="2xx">2xx success</option>
          <option value="4xx">4xx client error</option>
          <option value="5xx">5xx server error</option>
        </select>
        <input aria-label="Filter by endpoint path" value={filters.endpoint} onChange={(e) => set('endpoint', e.target.value)} placeholder="/path filter" className="input font-mono" autoComplete="off" spellCheck={false} />
        <input type="date" value={filters.from} onChange={(e) => set('from', e.target.value)} className="input" aria-label="From date" />
        <input type="date" value={filters.to} onChange={(e) => set('to', e.target.value)} className="input" aria-label="To date" />
        <button onClick={() => setFilters((f) => ({ ...f, status: '', endpoint: '', from: '', to: '', projectId: '', page: 1 }))} className="btn-secondary !py-2 !text-xs">Clear filters</button>
      </div>

      <Table
        loading={loading}
        data={logs}
        emptyTitle="No logs match"
        emptyHint="Try widening the date range or clearing filters."
        columns={[
          { key: 'time', title: 'Time', render: (r) => <span className="whitespace-nowrap text-xs">{formatDate(r.createdAt || r.timestamp)}</span> },
          { key: 'method', title: 'Method', render: (r) => <MethodBadge method={r.method} /> },
          { key: 'path', title: 'Endpoint', render: (r) => <code className="font-mono text-xs">{r.path || r.endpoint || r.url}</code> },
          { key: 'status', title: 'Status', render: (r) => <StatusBadge status={r.status || r.statusCode} /> },
          { key: 'latency', title: 'Latency', render: (r) => <span className="text-xs">{formatMs(r.responseTimeMs ?? r.latencyMs ?? r.latency ?? r.durationMs)}</span> },
          { key: 'project', title: 'Project', render: (r) => {
            const p = r.project;
            const label = (typeof p === 'object' && p !== null ? (p.name || p.slug) : null)
              || r.projectName
              || (r.projectId ? String(r.projectId).slice(-6) : null)
              || (typeof p === 'string' ? p.slice(-6) : '—');
            return <span className="text-xs text-slate-500">{label}</span>;
          } },
        ]}
      />

      <div className="flex items-center justify-between text-sm">
        <p className="text-slate-500">Page {filters.page}{meta?.totalPages ? ` of ${meta.totalPages}` : ''}{meta?.total != null ? ` · ${meta.total} rows` : ''}</p>
        <div className="flex gap-2">
          <button disabled={filters.page <= 1} onClick={() => set('page', Math.max(1, filters.page - 1))} className="btn-secondary !py-1.5 !text-xs disabled:opacity-40">Prev</button>
          <button disabled={meta?.totalPages ? filters.page >= meta.totalPages : logs.length < (filters.limit || 20)} onClick={() => set('page', filters.page + 1)} className="btn-secondary !py-1.5 !text-xs disabled:opacity-40">Next</button>
        </div>
      </div>
    </div>
  );
}
