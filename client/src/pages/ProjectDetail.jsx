import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Send, Trash2, Undo2 } from 'lucide-react';
import { projectService } from '../services/projectService.js';
import { keyService } from '../services/keyService.js';
import { logService } from '../services/logService.js';
import { webhookService } from '../services/webhookService.js';
import { analyticsService } from '../services/analyticsService.js';
import { useAuth } from '../context/AuthContext.jsx';
import { invalidateProjectsCache } from '../hooks/useProjects.js';
import { useToast } from '../context/ToastContext.jsx';
import { extractError } from '../services/api.js';
import Table from '../components/Table.jsx';
import EmptyState, { ErrorState } from '../components/EmptyState.jsx';
import Skeleton from '../components/Skeleton.jsx';
import CopyButton from '../components/CopyButton.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import Badge, { MethodBadge, StatusBadge, ProjectStatusBadge } from '../components/Badge.jsx';
import { formatDate, formatMs, formatNumber, formatPercent } from '../utils/format.js';
import Endpoints from './Endpoints.jsx';
import Keys from './Keys.jsx';
import Webhooks from './Webhooks.jsx';
import Docs from './Docs.jsx';

const TABS = ['overview', 'endpoints', 'versions', 'keys', 'logs', 'webhooks', 'docs', 'analytics'];

export default function ProjectDetail() {
  const { id } = useParams();
  const { logout } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState('overview');
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [versions, setVersions] = useState([]);
  const [keys, setKeys] = useState([]);
  const [logs, setLogs] = useState([]);
  const [webhooks, setWebhooks] = useState([]);
  const [stats, setStats] = useState(null);
  const [newVersion, setNewVersion] = useState('v1');
  const [newVersionNotes, setNewVersionNotes] = useState('');
  const [copyFrom, setCopyFrom] = useState('');
  const [creatingVersion, setCreatingVersion] = useState(false);
  const [confirmDeleteVersion, setConfirmDeleteVersion] = useState(null);
  const [statusBusy, setStatusBusy] = useState(false);

  const onTogglePublish = async () => {
    const isPublished = String(project?.status).toLowerCase() === 'published';
    setStatusBusy(true);
    try {
      await (isPublished ? projectService.unpublish(id) : projectService.publish(id));
      toast.success(isPublished ? 'Project back to draft — gateway now 404s' : 'Project published — live on the gateway');
      const p = await projectService.get(id);
      setProject(p?.project ?? p?.data ?? p);
      invalidateProjectsCache();
    } catch (e) {
      toast.error(extractError(e, 'Update failed'));
    } finally {
      setStatusBusy(false);
    }
  };

  const reloadVersions = async () => {
    try {
      const v = await projectService.listVersions(id).catch((e) => { console.error('[versions failed]', e?.response?.data || e.message); return []; });
      const arr = (x) => (Array.isArray(x) ? x : x?.items || x?.data || []);
      setVersions(arr(v));
    } catch (e) { console.error('[reloadVersions failed]', e); }
  };

  const onCreateVersion = async (e) => {
    e?.preventDefault?.();
    const version = (newVersion || '').trim() || 'v1';
    setCreatingVersion(true);
    try {
      const body = { version, description: newVersionNotes.trim(), isDefault: versions.length === 0 };
      if (copyFrom) body.copyFrom = copyFrom;
      const res = await projectService.createVersion(id, body);
      toast.success(`Version ${version} created${res?.copiedEndpoints ? ` (${res.copiedEndpoints} endpoints copied)` : ''}`);
      setNewVersion('');
      setNewVersionNotes('');
      setCopyFrom('');
      await reloadVersions();
    } catch (err) {
      toast.error(extractError(err, 'Could not create version'));
    } finally {
      setCreatingVersion(false);
    }
  };

  const onDeleteVersion = async () => {
    const row = confirmDeleteVersion;
    if (!row) return;
    const vid = row._id || row.id;
    try {
      await projectService.deleteVersion(id, vid);
      toast.success('Version deleted');
      setConfirmDeleteVersion(null);
      await reloadVersions();
    } catch (err) {
      toast.error(extractError(err, 'Delete failed'));
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const p = await projectService.get(id);
        if (cancelled) return;
        setProject(p?.project ?? p?.data ?? p);
        const [v, k, l, w, a] = await Promise.all([
          projectService.listVersions(id).catch((e) => { console.error('[ProjectDetail versions failed]', e?.response?.data || e.message); return []; }),
          keyService.listByProject(id).catch((e) => { console.error('[ProjectDetail keys failed]', e?.response?.data || e.message); return []; }),
          logService.list({ projectId: id, limit: 10 }).catch((e) => { console.error('[ProjectDetail logs failed]', e?.response?.data || e.message); return []; }),
          webhookService.list(id).catch((e) => { console.error('[ProjectDetail webhooks failed]', e?.response?.data || e.message); return []; }),
          analyticsService.overview({ projectId: id, range: '30d' }).catch((e) => { console.error('[ProjectDetail analytics failed]', e?.response?.data || e.message); return null; }),
        ]);
        if (cancelled) return;
        const arr = (x) => (Array.isArray(x) ? x : x?.items || x?.data || []);
        setVersions(arr(v));
        setKeys(arr(k));
        setLogs(arr(l));
        setWebhooks(arr(w));
        setStats(a?.data ?? a);
      } catch (e) {
        if (cancelled) return;
        console.error('[ProjectDetail load failed]', e?.response?.data || e);
        setError(extractError(e, 'Failed to load project'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const refetchAll = async () => {
    setLoading(true);
    setError('');
    try {
      const p = await projectService.get(id);
      setProject(p?.project ?? p?.data ?? p);
      await reloadVersions();
    } catch (e) {
      setError(extractError(e, 'Failed to load project'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="space-y-3">
        <ErrorState message={error} onRetry={refetchAll} />
        <div className="flex flex-wrap gap-2">
          <Link to="/projects" className="btn-secondary">Back to Projects</Link>
          <button onClick={() => { logout(); window.location.href = '/login'; }} className="btn-secondary">Logout / switch account</button>
        </div>
      </div>
    );
  }
  if (!project) return <EmptyState title="Project not found" />;

  const pid = project._id || project.id || id;

  return (
    <div className="space-y-5">
      <Link to="/projects" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white">
        <ArrowLeft size={15} /> All projects
      </Link>
      <div className="card flex flex-col justify-between gap-3 p-5 sm:flex-row sm:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">{project.name}</h1>
            <ProjectStatusBadge status={project.status} />
          </div>
          <p className="text-sm text-slate-500">{project.description || 'No description'}</p>
          <p className="mt-1 font-mono text-xs text-slate-400">{project.basePath || '/'} · {project.upstreamUrl || 'no upstream set'}{project.slug ? <> · /{project.slug}</> : null}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onTogglePublish}
            disabled={statusBusy}
            className={String(project.status).toLowerCase() === 'published' ? 'btn-secondary !py-2 !text-xs' : 'btn-primary !py-2 !text-xs'}
            title={String(project.status).toLowerCase() === 'published' ? 'Unpublish — gateway returns 404 until re-published' : 'Publish — serve this project through the gateway'}
          >
            {String(project.status).toLowerCase() === 'published' ? <><Undo2 size={14} /> Unpublish</> : <><Send size={14} /> Publish</>}
          </button>
          <Badge tone="blue">{versions.length} versions</Badge>
          <Badge tone="green">{keys.length} keys</Badge>
          <Badge tone="purple">{webhooks.length} webhooks</Badge>
          <CopyButton text={pid} label="Copy ID" />
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-3.5 py-2 text-sm font-medium capitalize ${tab === t ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card p-5">
            <h3 className="font-semibold text-slate-900 dark:text-white">Stats (30d)</h3>
            {stats ? (
              <>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {[
                    { label: 'Requests', value: formatNumber(stats.total) },
                    { label: 'Success rate', value: stats.errorRate != null ? formatPercent((100 - Number(stats.errorRate)) / 100) : '—' },
                    { label: 'Errors', value: formatNumber(stats.errors) },
                    { label: 'Avg latency', value: formatMs(stats.avgLatencyMs) },
                    { label: 'p95 latency', value: formatMs(stats.p95LatencyMs) },
                    { label: 'Active keys', value: formatNumber(stats.activeKeys ?? stats.keys) },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{s.label}</p>
                      <p className="mt-1 text-lg font-bold tabular-nums text-slate-900 dark:text-white">{s.value}</p>
                    </div>
                  ))}
                </div>
                {Array.isArray(stats.byEndpoint) && stats.byEndpoint.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Top endpoints</p>
                    <ul className="mt-2 space-y-1.5">
                      {stats.byEndpoint.slice(0, 5).map((e) => (
                        <li key={e.endpoint} className="flex items-center justify-between gap-3 text-xs">
                          <code className="truncate font-mono text-slate-600 dark:text-slate-300">{e.endpoint || '—'}</code>
                          <span className="shrink-0 tabular-nums text-slate-500">{formatNumber(e.count)} calls · {formatMs(e.avgLatencyMs)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <p className="mt-2 text-sm text-slate-500">No analytics yet for this project.</p>
            )}
          </div>
          <div className="card p-5">
            <h3 className="font-semibold text-slate-900 dark:text-white">Recent logs</h3>
            <div className="mt-3">
              <Table
                data={logs.slice(0, 6)}
                emptyTitle="No logs"
                columns={[
                  { key: 'method', title: 'Method', render: (r) => <MethodBadge method={r.method} /> },
                  { key: 'path', title: 'Path', render: (r) => <code className="font-mono text-xs">{r.path || r.endpoint}</code> },
                  { key: 'status', title: 'Status', render: (r) => <StatusBadge status={r.status || r.statusCode} /> },
                  { key: 'latency', title: 'Latency', render: (r) => formatMs(r.responseTimeMs ?? r.latencyMs ?? r.latency ?? r.durationMs) },
                ]}
              />
            </div>
          </div>
        </div>
      )}

      {tab === 'endpoints' && <Endpoints embedded projectId={pid} />}
      {tab === 'keys' && <Keys embedded projectId={pid} />}
      {tab === 'webhooks' && <Webhooks embedded projectId={pid} />}
      {tab === 'docs' && <Docs embedded projectId={pid} project={project} />}

      {tab === 'versions' && (
        <div className="card p-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <h3 className="font-semibold text-slate-900 dark:text-white">Versions</h3>
            <form onSubmit={onCreateVersion} className="flex flex-wrap items-center gap-2">
              <input
                value={newVersion}
                onChange={(e) => setNewVersion(e.target.value)}
                placeholder="v1"
                className="input !w-28 font-mono"
              />
              <input
                value={newVersionNotes}
                onChange={(e) => setNewVersionNotes(e.target.value)}
                placeholder="Notes (e.g. initial release)"
                className="input !w-48"
              />
              <select value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)} className="input !w-auto !py-2 !text-xs" title="Copy endpoints from">
                <option value="">No copy</option>
                {versions.map((v) => <option key={v._id || v.id} value={v.version}>{`Copy from ${v.version}`}</option>)}
              </select>
              <button disabled={creatingVersion} className="btn-primary !py-2 !text-xs">
                {creatingVersion ? 'Creating…' : 'Create version'}
              </button>
            </form>
          </div>
          <div className="mt-3">
            <Table
              data={versions}
              emptyTitle="No versions"
              emptyHint="Publish a version to snapshot your endpoints."
              columns={[
                { key: 'version', title: 'Version', render: (r) => <Badge>{r.version || r.name || r._id}</Badge> },
                { key: 'createdAt', title: 'Created', render: (r) => formatDate(r.createdAt) },
                { key: 'notes', title: 'Notes', render: (r) => <span className="text-xs text-slate-500">{r.notes || r.description || '—'}</span> },
                { key: 'actions', title: 'Actions', render: (r) => (
                  <button
                    onClick={() => setConfirmDeleteVersion(r)}
                    className="rounded-lg p-1.5 text-rose-500 transition hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    title={`Delete version ${r.version || r.name}`}
                    aria-label={`Delete version ${r.version || r.name}`}
                  >
                    <Trash2 size={15} />
                  </button>
                ) },
              ]}
            />
          </div>
        </div>
      )}

      {tab === 'logs' && (
        <div className="card p-5">
          <h3 className="font-semibold text-slate-900 dark:text-white">Latest logs</h3>
          <div className="mt-3">
            <Table
              data={logs}
              emptyTitle="No logs for this project"
              columns={[
                { key: 'createdAt', title: 'Time', render: (r) => <span className="text-xs">{formatDate(r.createdAt || r.timestamp)}</span> },
                { key: 'method', title: 'Method', render: (r) => <MethodBadge method={r.method} /> },
                { key: 'status', title: 'Status', render: (r) => <StatusBadge status={r.status || r.statusCode} /> },
                { key: 'latency', title: 'Latency', render: (r) => formatMs(r.responseTimeMs ?? r.latencyMs ?? r.latency) },
              ]}
            />
          </div>
          <Link to={`/logs?projectId=${pid}`} className="mt-3 inline-block text-sm font-semibold text-brand-600 hover:underline">Open full log explorer →</Link>
        </div>
      )}

      {tab === 'analytics' && (
        <div className="card p-5">
          <h3 className="font-semibold">Project analytics</h3>
          <p className="mt-1 text-sm text-slate-500">Full breakdown lives on the Analytics page scoped to this project.</p>
          <Link to={`/analytics?projectId=${pid}`} className="btn-secondary mt-3">Open Analytics</Link>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDeleteVersion}
        onClose={() => setConfirmDeleteVersion(null)}
        onConfirm={onDeleteVersion}
        title="Delete version?"
        confirmLabel="Delete version"
        message={confirmDeleteVersion ? `Permanently deletes version "${confirmDeleteVersion.version || confirmDeleteVersion.name}" and its endpoints. This cannot be undone.` : ''}
      />
    </div>
  );
}
