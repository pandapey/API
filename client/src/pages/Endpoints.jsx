import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Gauge, Plus, Trash2 } from 'lucide-react';
import { projectService } from '../services/projectService.js';
import { endpointSchema } from '../schemas/endpointSchema.js';
import { useToast } from '../context/ToastContext.jsx';
import { extractError } from '../services/api.js';
import Table from '../components/Table.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { MethodBadge } from '../components/Badge.jsx';
import { useProjects } from '../hooks/useProjects.js';

function arr(x) {
  if (Array.isArray(x)) return x;
  return x?.items || x?.endpoints || x?.data || [];
}

export default function Endpoints({ embedded = false, projectId: fixedProjectId }) {
  const { projects } = useProjects();
  const toast = useToast();
  const [projectId, setProjectId] = useState(fixedProjectId || '');
  const [versions, setVersions] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
    resolver: zodResolver(endpointSchema),
    defaultValues: { method: 'GET', path: '', description: '', version: 'v1', authRequired: true },
  });
  const authRequired = watch('authRequired');
  const [confirmDelete, setConfirmDelete] = useState(null); // endpoint row
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (fixedProjectId) setProjectId(fixedProjectId);
    else if (projects.length && !projectId) setProjectId(projects[0]._id || projects[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, fixedProjectId]);

  const fetchAll = async () => {
    if (!projectId) return;
    const pid = projectId;
    setLoading(true);
    try {
      const [epRes, vRes] = await Promise.all([
        projectService.listEndpoints(pid),
        projectService.listVersions(pid).catch(() => []),
      ]);
      if (!mountedRef.current) return; // stale (unmounted or project switched)
      setItems(arr(epRes));
      const vArr = arr(vRes);
      setVersions(vArr);
      if (vArr.length && !vArr.some((v) => (v.version || v.name) === 'v1')) {
        setValue('version', vArr[0].version || vArr[0].name || 'v1');
      }
    } catch (e) {
      if (!mountedRef.current) return;
      toast.error(extractError(e, 'Failed to load endpoints'));
      setItems([]);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const onCreate = async (v) => {
    setBusy(true);
    try {
      const payload = {
        method: v.method,
        path: v.path,
        description: v.description || '',
        version: v.version || versions[0]?.version || 'v1',
        authRequired: v.authRequired ?? true,
      };
      await projectService.createEndpoint(projectId, payload);
      toast.success('Endpoint created');
      setOpen(false);
      reset();
      fetchAll();
    } catch (e) {
      toast.error(extractError(e, 'Could not create endpoint'));
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    const row = confirmDelete;
    if (!row) return;
    try {
      await projectService.deleteEndpoint(projectId, row._id || row.id);
      toast.success('Endpoint deleted');
      setConfirmDelete(null);
      fetchAll();
    } catch (e) {
      toast.error(extractError(e, 'Delete failed'));
    }
  };

  return (
    <div className="space-y-4">
      {!embedded && (
        <PageHeader
          icon={Gauge}
          title="Endpoints"
          subtitle="Manage gateway routes per project."
          actions={
            <select
              aria-label="Select project"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="input !w-auto"
            >
              {projects.map((p) => <option key={p._id || p.id} value={p._id || p.id}>{p.name}</option>)}
            </select>
          }
        />
      )}
      <div className="flex justify-end">
        <button disabled={!projectId} onClick={() => setOpen(true)} className="btn-primary"><Plus size={16} /> New endpoint</button>
      </div>
      <Table
        loading={loading}
        data={items}
        emptyTitle="No endpoints"
        emptyHint="Add your first route — method + path."
        emptyAction={<button onClick={() => setOpen(true)} className="btn-primary" disabled={!projectId}><Plus size={16} /> Add an endpoint</button>}
        columns={[
          { key: 'method', title: 'Method', render: (r) => <MethodBadge method={r.method} /> },
          { key: 'path', title: 'Path', render: (r) => <code className="font-mono text-xs">{r.path}</code> },
          { key: 'version', title: 'Version', render: (r) => <span className="text-xs text-slate-500">{r.version || 'v1'}</span> },
          { key: 'auth', title: 'Auth', render: (r) => <span className={`text-xs font-medium ${r.authRequired ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{r.authRequired ? 'API key' : 'Public'}</span> },
          { key: 'description', title: 'Description', render: (r) => <span className="max-w-[260px] truncate text-xs text-slate-500">{r.description || '—'}</span> },
          { key: 'actions', title: 'Actions', render: (r) => (
            <button
              onClick={() => setConfirmDelete(r)}
              className="rounded-lg p-1.5 text-rose-500 transition hover:bg-rose-50 dark:hover:bg-rose-950/40"
              title={`Delete ${r.method} ${r.path}`}
              aria-label={`Delete endpoint ${r.method} ${r.path}`}
            >
              <Trash2 size={16} />
            </button>
          ) },
        ]}
      />
      <Modal open={open} onClose={() => setOpen(false)} title="New endpoint">
        <form onSubmit={handleSubmit(onCreate)} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="ep-method" className="label">Method</label>
              <select id="ep-method" className="input" {...register('method')}>
                {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => <option key={m}>{m}</option>)}
              </select>
              {errors.method && <p role="alert" className="mt-1 text-xs text-rose-500">{errors.method.message}</p>}
            </div>
            <div className="col-span-2">
              <label htmlFor="ep-path" className="label">Path</label>
              <input id="ep-path" className="input font-mono" {...register('path')} placeholder="/current" />
              {errors.path && <p role="alert" className="mt-1 text-xs text-rose-500">{errors.path.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="ep-version" className="label">Version</label>
              {versions.length ? (
                <select id="ep-version" className="input font-mono" {...register('version')}>
                  {versions.map((v) => <option key={v._id || v.id || v.version} value={v.version}>{v.version}</option>)}
                </select>
              ) : (
                <input id="ep-version" className="input font-mono" {...register('version')} placeholder="v1" />
              )}
            </div>
            <div>
              <label htmlFor="ep-auth" className="label">Auth</label>
              <label htmlFor="ep-auth" className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm dark:border-slate-700">
                <input id="ep-auth" type="checkbox" {...register('authRequired')} defaultChecked={authRequired} className="accent-indigo-600" />
                Requires API key
              </label>
            </div>
          </div>
          <div>
            <label htmlFor="ep-desc" className="label">Description</label>
            <input id="ep-desc" className="input" {...register('description')} placeholder="What does it return?" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary">Cancel</button>
            <button disabled={busy} className="btn-primary">{busy ? 'Saving…' : 'Create'}</button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={onDelete}
        title="Delete endpoint?"
        confirmLabel="Delete endpoint"
        message={confirmDelete ? `This permanently removes ${confirmDelete.method} ${confirmDelete.path} from the gateway. Existing logs keep their history.` : ''}
      />
    </div>
  );
}
