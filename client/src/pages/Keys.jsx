import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Ban, KeyRound, Plus, RefreshCcw, Trash2 } from 'lucide-react';
import { keyService } from '../services/keyService.js';
import { keySchema } from '../schemas/keySchema.js';
import { useProjects } from '../hooks/useProjects.js';
import { useToast } from '../context/ToastContext.jsx';
import { extractError } from '../services/api.js';
import Table from '../components/Table.jsx';
import Modal from '../components/Modal.jsx';
import ApiKeyModal from '../components/ApiKeyModal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Badge from '../components/Badge.jsx';
import { formatDate, truncate } from '../utils/format.js';

function arr(x) {
  if (Array.isArray(x)) return x;
  return x?.items || x?.keys || x?.data || [];
}

export default function Keys({ embedded = false, projectId: fixedProjectId }) {
  const { projects } = useProjects();
  const toast = useToast();
  const [projectFilter, setProjectFilter] = useState(fixedProjectId || '');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rowBusy, setRowBusy] = useState(false);
  const [rawKey, setRawKey] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); // { type: 'revoke' | 'delete', row }
  // Stable "is the component still mounted" check for post-await refreshes.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);
  const cancelledRef = () => !mountedRef.current;
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({ resolver: zodResolver(keySchema) });
  const watchedProjectId = watch('projectId');

  // Keep modal project in sync once projects load (controlled, not defaultValue).
  useEffect(() => {
    if (open && projects.length && !watchedProjectId) {
      setValue('projectId', projectFilter || projects[0]._id || projects[0].id, { shouldValidate: true });
    }
  }, [open, projects, projectFilter, watchedProjectId, setValue]);

  useEffect(() => {
    if (fixedProjectId) setProjectFilter(fixedProjectId);
  }, [fixedProjectId]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const params = projectFilter ? { projectId: projectFilter } : {};
        const res = await keyService.list(params);
        if (cancelled) return;
        setItems(arr(res));
      } catch (e) {
        if (cancelled) return;
        toast.error(extractError(e, 'Failed to load keys'));
        setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectFilter]);

  const onCreate = async (v) => {
    setBusy(true);
    try {
      const projectId = v.projectId || projectFilter || projects[0]?._id || projects[0]?.id;
      if (!projectId) {
        toast.error('Pick a project first');
        setBusy(false);
        return;
      }
      const payload = { name: v.name };
      if (v.rateLimit) payload.rateLimitPerMin = Number(v.rateLimit);
      if (v.scopes && String(v.scopes).trim()) {
        payload.scopes = String(v.scopes).split(',').map((s) => s.trim()).filter(Boolean);
      }
      if (v.expiresInDays && Number(v.expiresInDays) > 0) {
        payload.expiresAt = new Date(Date.now() + Number(v.expiresInDays) * 24 * 60 * 60 * 1000).toISOString();
      }
      const res = await keyService.create(projectId, payload);
      const raw = res?.apiKey || res?.key || res?.token || res?.plainKey;
      setRawKey({ value: raw || '(stored — copy from response)', name: payload.name });
      toast.success('API key issued');
      setOpen(false);
      reset();
      setConfirmAction(null);
      // refresh list
      const fresh = await keyService.list(projectFilter ? { projectId: projectFilter } : {});
      if (!cancelledRef()) setItems(arr(fresh));
    } catch (e) {
      toast.error(extractError(e, 'Could not create key'));
    } finally {
      setBusy(false);
    }
  };

  const onConfirmAction = async () => {
    if (!confirmAction) return;
    const { type, row } = confirmAction;
    setRowBusy(true);
    try {
      if (type === 'revoke') {
        await keyService.revoke(row._id || row.id);
        toast.success(`Key "${row.name}" revoked`);
      } else {
        await keyService.delete(row._id || row.id);
        toast.success(`Key "${row.name}" permanently deleted`);
      }
      setConfirmAction(null);
      const fresh = await keyService.list(projectFilter ? { projectId: projectFilter } : {});
      if (!cancelledRef()) setItems(arr(fresh));
    } catch (e) {
      toast.error(extractError(e, type === 'revoke' ? 'Revoke failed' : 'Delete failed'));
    } finally {
      setRowBusy(false);
    }
  };

  const onRotate = async (row) => {
    setRowBusy(true);
    try {
      const res = await keyService.rotate(row._id || row.id);
      const raw = res?.apiKey || res?.key || res?.plainKey;
      setRawKey({ value: raw || '(stored — copy from response)', name: row.name });
      toast.success('Key rotated — old key revoked, new key shown once');
      const fresh = await keyService.list(projectFilter ? { projectId: projectFilter } : {});
      if (!cancelledRef()) setItems(arr(fresh));
    } catch (e) {
      toast.error(extractError(e, 'Rotate failed'));
    } finally {
      setRowBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {!embedded && (
        <PageHeader
          icon={KeyRound}
          title="API Keys"
          subtitle="Issue, rotate and revoke keys. Raw values are shown once."
          actions={
            <select
              aria-label="Filter keys by project"
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="input !w-auto"
            >
              <option value="">All projects</option>
              {projects.map((p) => <option key={p._id || p.id} value={p._id || p.id}>{p.name}</option>)}
            </select>
          }
        />
      )}
      <div className="flex justify-end">
        <button onClick={() => setOpen(true)} className="btn-primary"><Plus size={16} /> New key</button>
      </div>
      <Table
        loading={loading}
        data={items}
        emptyTitle="No API keys"
        emptyHint="Create a key to authenticate gateway requests."
        emptyAction={<button onClick={() => setOpen(true)} className="btn-primary"><Plus size={16} /> Issue your first key</button>}
        columns={[
          { key: 'name', title: 'Name', render: (r) => <span className="font-semibold">{r.name}</span> },
          { key: 'prefix', title: 'Prefix', render: (r) => <code className="font-mono text-xs">{truncate(r.prefix || r.keyPrefix || r.masked || '••••', 20)}</code> },
          { key: 'project', title: 'Project', render: (r) => {
            const p = r.project;
            const pid = typeof p === 'object' && p !== null ? (p._id || p.id) : (p || r.projectId);
            const pname = (typeof p === 'object' && p !== null ? (p.name || p.slug) : null)
              || r.projectName
              || projects.find((x) => (x._id || x.id) === pid)?.name
              || (pid ? String(pid).slice(-6) : '—');
            return <span className="text-xs">{pname}</span>;
          } },
          { key: 'rate', title: 'Limit', render: (r) => <span className="text-xs tabular-nums text-slate-500">{r.rateLimitPerMin ? `${r.rateLimitPerMin}/min` : '—'}</span> },
          { key: 'status', title: 'Status', render: (r) => <Badge tone={r.revoked ? 'red' : 'green'}>{r.revoked ? 'revoked' : 'active'}</Badge> },
          { key: 'createdAt', title: 'Created', render: (r) => <span className="text-xs text-slate-500">{formatDate(r.createdAt)}</span> },
          { key: 'actions', title: 'Actions', render: (r) => (
            <div className="flex items-center justify-end gap-1">
              {!r.revoked && (
                <>
                  <button
                    onClick={() => onRotate(r)}
                    disabled={rowBusy}
                    className="rounded-lg p-1.5 text-slate-500 transition hover:bg-brand-50 hover:text-brand-600 disabled:opacity-50 dark:hover:bg-brand-950/40"
                    title="Rotate: revoke this key and issue a new one (new raw value shown once)"
                    aria-label={`Rotate key ${r.name}`}
                  >
                    <RefreshCcw size={15} />
                  </button>
                  <button
                    onClick={() => setConfirmAction({ type: 'revoke', row: r })}
                    disabled={rowBusy}
                    className="rounded-lg p-1.5 text-amber-600 transition hover:bg-amber-50 disabled:opacity-50 dark:text-amber-400 dark:hover:bg-amber-950/40"
                    title="Revoke: disable the key (usage stats are kept)"
                    aria-label={`Revoke key ${r.name}`}
                  >
                    <Ban size={15} />
                  </button>
                </>
              )}
              <button
                onClick={() => setConfirmAction({ type: 'delete', row: r })}
                disabled={rowBusy}
                className="rounded-lg p-1.5 text-rose-500 transition hover:bg-rose-50 disabled:opacity-50 dark:hover:bg-rose-950/40"
                title={r.revoked ? 'Delete permanently' : 'Revoke first — deletion is permanent and removes usage stats'}
                aria-label={`Delete key ${r.name}`}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ) },
        ]}
      />
      <Modal open={open} onClose={() => setOpen(false)} title="New API key">
        <form onSubmit={handleSubmit(onCreate)} className="space-y-4">
          <div>
            <label htmlFor="key-name" className="label">Name</label>
            <input id="key-name" className="input" {...register('name')} placeholder="prod-frontend" autoComplete="off" />
            {errors.name && <p role="alert" className="mt-1 text-xs text-rose-500">{errors.name.message}</p>}
          </div>
          <div>
            <label htmlFor="key-project" className="label">Project</label>
            <select id="key-project" className="input" {...register('projectId')}>
              <option value="">Select project…</option>
              {projects.map((p) => <option key={p._id || p.id} value={p._id || p.id}>{p.name}</option>)}
            </select>
            {errors.projectId && <p role="alert" className="mt-1 text-xs text-rose-500">{errors.projectId.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="key-expires" className="label">Expires in (days, 0 = never)</label>
              <input id="key-expires" type="number" min="0" className="input" {...register('expiresInDays')} placeholder="90" />
            </div>
            <div>
              <label htmlFor="key-rate" className="label">Rate limit / min</label>
              <input id="key-rate" type="number" min="1" className="input" {...register('rateLimit')} placeholder="1000" />
            </div>
          </div>
          <div>
            <label htmlFor="key-scopes" className="label">Scopes (comma-separated, blank = all — e.g. GET /hello, POST /orders or *)</label>
            <input id="key-scopes" className="input font-mono" {...register('scopes')} placeholder="GET /hello, POST /orders" autoComplete="off" spellCheck={false} />
            {errors.scopes && <p className="mt-1 text-xs text-rose-500">{errors.scopes.message}</p>}
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary">Cancel</button>
            <button disabled={busy} className="btn-primary">{busy ? 'Issuing…' : 'Issue key'}</button>
          </div>
        </form>
      </Modal>
      <ApiKeyModal open={!!rawKey} onClose={() => setRawKey(null)} apiKey={rawKey?.value} name={rawKey?.name} />
      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={onConfirmAction}
        busy={rowBusy}
        tone={confirmAction?.type === 'delete' ? 'danger' : 'brand'}
        title={confirmAction?.type === 'delete' ? 'Delete key permanently?' : 'Revoke key?'}
        confirmLabel={confirmAction?.type === 'delete' ? 'Delete forever' : 'Revoke key'}
        message={
          confirmAction?.type === 'delete'
            ? `This permanently deletes "${confirmAction?.row?.name}" and its usage stats. This cannot be undone.`
            : `"${confirmAction?.row?.name}" will stop working immediately. You can still rotate or delete it later.`
        }
      />
    </div>
  );
}
