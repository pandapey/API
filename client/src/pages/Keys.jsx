import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound, Plus, Trash2 } from 'lucide-react';
import { keyService } from '../services/keyService.js';
import { keySchema } from '../schemas/keySchema.js';
import { useProjects } from '../hooks/useProjects.js';
import { useToast } from '../context/ToastContext.jsx';
import { extractError } from '../services/api.js';
import Table from '../components/Table.jsx';
import Modal from '../components/Modal.jsx';
import ApiKeyModal from '../components/ApiKeyModal.jsx';
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
  const [rawKey, setRawKey] = useState(null);
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({ resolver: zodResolver(keySchema) });
  const watchedProjectId = watch('projectId');

  // Keep modal project in sync once projects load (controlled, not defaultValue).
  useEffect(() => {
    if (open && projects.length && !watchedProjectId) {
      setValue('projectId', projectFilter || projects[0]._id || projects[0].id, { shouldValidate: true });
    }
  }, [open, projects, projectFilter, watchedProjectId, setValue]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const params = projectFilter ? { projectId: projectFilter } : {};
      const res = await keyService.list(params);
      setItems(arr(res));
    } catch (e) {
      toast.error(extractError(e, 'Failed to load keys'));
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (fixedProjectId) setProjectFilter(fixedProjectId);
  }, [fixedProjectId]);

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectFilter]);

  const onCreate = async (v) => {
    setBusy(true);
    try {
      const projectId = v.projectId || projectFilter || projects[0]?._id || projects[0]?.id;
      if (!projectId) return toast.error('Pick a project first');
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
      fetchAll();
    } catch (e) {
      toast.error(extractError(e, 'Could not create key'));
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (row) => {
    if (!confirm(`Revoke key "${row.name}"? This cannot be undone.`)) return;
    try {
      await keyService.delete(row._id || row.id);
      toast.success('Key revoked');
      fetchAll();
    } catch (e) {
      toast.error(extractError(e, 'Revoke failed'));
    }
  };

  return (
    <div className="space-y-4">
      {!embedded && (
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white"><KeyRound size={20} /> API Keys</h1>
            <p className="text-sm text-slate-500">Issue and revoke keys. Raw values are shown once.</p>
          </div>
          <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="input !w-auto">
            <option value="">All projects</option>
            {projects.map((p) => <option key={p._id || p.id} value={p._id || p.id}>{p.name}</option>)}
          </select>
        </div>
      )}
      <div className="flex justify-end">
        <button onClick={() => setOpen(true)} className="btn-primary"><Plus size={16} /> New key</button>
      </div>
      <Table
        loading={loading}
        data={items}
        emptyTitle="No API keys"
        emptyHint="Create a key to authenticate gateway requests."
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
          { key: 'status', title: 'Status', render: (r) => <Badge tone={r.revoked ? 'red' : 'green'}>{r.revoked ? 'revoked' : 'active'}</Badge> },
          { key: 'createdAt', title: 'Created', render: (r) => <span className="text-xs text-slate-500">{formatDate(r.createdAt)}</span> },
          { key: 'actions', title: '', render: (r) => (
            <button onClick={() => onDelete(r)} className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50"><Trash2 size={16} /></button>
          ) },
        ]}
      />
      <Modal open={open} onClose={() => setOpen(false)} title="New API key">
        <form onSubmit={handleSubmit(onCreate)} className="space-y-4">
          <div>
            <label htmlFor="key-name" className="label">Name</label>
            <input id="key-name" className="input" {...register('name')} placeholder="prod-frontend" />
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
              <label className="label">Expires in (days, 0 = never)</label>
              <input type="number" className="input" {...register('expiresInDays')} placeholder="90" />
            </div>
            <div>
              <label className="label">Rate limit / min</label>
              <input type="number" className="input" {...register('rateLimit')} placeholder="1000" />
            </div>
          </div>
          <div>
            <label className="label">Scopes (comma-separated, blank = all — e.g. GET /hello, POST /orders or *)</label>
            <input className="input font-mono" {...register('scopes')} placeholder="GET /hello, POST /orders" />
            {errors.scopes && <p className="mt-1 text-xs text-rose-500">{errors.scopes.message}</p>}
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary">Cancel</button>
            <button disabled={busy} className="btn-primary">{busy ? 'Issuing…' : 'Issue key'}</button>
          </div>
        </form>
      </Modal>
      <ApiKeyModal open={!!rawKey} onClose={() => setRawKey(null)} apiKey={rawKey?.value} name={rawKey?.name} />
    </div>
  );
}
