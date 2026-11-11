import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FolderKanban, Plus, Send, Undo2, Trash2 } from 'lucide-react';
import { useProjects, invalidateProjectsCache } from '../hooks/useProjects.js';
import { projectService } from '../services/projectService.js';
import { projectSchema } from '../schemas/projectSchema.js';
import { useToast } from '../context/ToastContext.jsx';
import { extractError } from '../services/api.js';
import Table from '../components/Table.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { ProjectStatusBadge } from '../components/Badge.jsx';import { formatDate } from '../utils/format.js';
import { ErrorState } from '../components/EmptyState.jsx';

export default function Projects() {
  const { projects, loading, error, refetch } = useProjects();
  const toast = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [rowBusy, setRowBusy] = useState(false);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ resolver: zodResolver(projectSchema) });

  const onCreate = async (v) => {
    setBusy(true);
    try {
      await projectService.create(v);
      toast.success('Project created');
      setOpen(false);
      reset();
      invalidateProjectsCache();
      refetch();
    } catch (e) {
      toast.error(extractError(e, 'Could not create project'));
    } finally {
      setBusy(false);
    }
  };

  const onTogglePublish = async (row) => {
    const isPublished = String(row.status).toLowerCase() === 'published';
    setRowBusy(true);
    try {
      await (isPublished ? projectService.unpublish(row._id || row.id) : projectService.publish(row._id || row.id));
      toast.success(isPublished ? `"${row.name}" is back to draft` : `"${row.name}" published`);
      invalidateProjectsCache();
      refetch();
    } catch (e) {
      toast.error(extractError(e, 'Update failed'));
    } finally {
      if (mountedRef.current) setRowBusy(false);
    }
  };

  const onDelete = async () => {
    const row = confirmDelete;
    if (!row) return;
    setRowBusy(true);
    try {
      await projectService.remove(row._id || row.id);
      toast.success(`Project "${row.name}" deleted`);
      setConfirmDelete(null);
      invalidateProjectsCache();
      refetch();
    } catch (e) {
      toast.error(extractError(e, 'Delete failed'));
    } finally {
      if (mountedRef.current) setRowBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        icon={FolderKanban}
        title="Projects"
        subtitle="Group endpoints, keys and webhooks per API."
        actions={<button onClick={() => setOpen(true)} className="btn-primary"><Plus size={16} /> New project</button>}
      />

      {error && <ErrorState message={error} onRetry={refetch} />}

      <Table
        loading={loading}
        data={projects}
        emptyTitle="No projects yet"
        emptyHint="Create your first project to start routing gateway traffic."
        emptyAction={<button onClick={() => setOpen(true)} className="btn-primary"><Plus size={16} /> Create a project</button>}
        onRowClick={(r) => navigate(`/projects/${r._id || r.id}`)}
        columns={[
          { key: 'name', title: 'Project', render: (r) => (
            <span className="block">
              <Link to={`/projects/${r._id || r.id}`} onClick={(e) => e.stopPropagation()} className="font-semibold text-brand-600 hover:underline dark:text-brand-300">{r.name}</Link>
              {r.slug && <span className="ml-2 font-mono text-[11px] text-slate-400">/{r.slug}</span>}
            </span>
          ) },
          { key: 'status', title: 'Status', render: (r) => <ProjectStatusBadge status={r.status} /> },
          { key: 'basePath', title: 'Base path', render: (r) => <code className="font-mono text-xs">{r.basePath || '/'}</code> },
          { key: 'description', title: 'Description', render: (r) => <span className="max-w-[220px] truncate text-slate-500">{r.description || '—'}</span> },
          { key: 'createdAt', title: 'Created', render: (r) => <span className="text-xs text-slate-500">{formatDate(r.createdAt)}</span> },
          { key: 'actions', title: 'Actions', render: (r) => {
            const isPublished = String(r.status).toLowerCase() === 'published';
            return (
              <span className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => onTogglePublish(r)}
                  disabled={rowBusy}
                  className={`rounded-lg p-1.5 transition hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800 ${isPublished ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}
                  title={isPublished ? 'Unpublish — gateway becomes 404 until re-published' : 'Publish — serve through the gateway'}
                  aria-label={isPublished ? `Unpublish project ${r.name}` : `Publish project ${r.name}`}
                >
                  {isPublished ? <Undo2 size={15} /> : <Send size={15} />}
                </button>
                <button
                  onClick={() => setConfirmDelete(r)}
                  disabled={rowBusy}
                  className="rounded-lg p-1.5 text-rose-500 transition hover:bg-rose-50 disabled:opacity-50 dark:hover:bg-rose-950/40"
                  title={`Delete ${r.name}`}
                  aria-label={`Delete project ${r.name}`}
                >
                  <Trash2 size={15} />
                </button>
              </span>
            );
          } },
        ]}
      />

      <Modal open={open} onClose={() => setOpen(false)} title="New project">
        <form onSubmit={handleSubmit(onCreate)} className="space-y-4">
          <div>
            <label htmlFor="proj-name" className="label">Name</label>
            <input id="proj-name" className="input" {...register('name')} placeholder="Weather API" autoComplete="off" />
            {errors.name && <p role="alert" className="mt-1 text-xs text-rose-500">{errors.name.message}</p>}
          </div>
          <div>
            <label htmlFor="proj-desc" className="label">Description</label>
            <textarea id="proj-desc" className="input" rows={3} {...register('description')} placeholder="What does this API do?" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="proj-basepath" className="label">Base path</label>
              <input id="proj-basepath" className="input font-mono" {...register('basePath')} placeholder="/weather" autoComplete="off" spellCheck={false} />
              {errors.basePath && <p role="alert" className="mt-1 text-xs text-rose-500">{errors.basePath.message}</p>}
            </div>
            <div>
              <label htmlFor="proj-upstream" className="label">Upstream URL</label>
              <input id="proj-upstream" className="input font-mono" {...register('upstreamUrl')} placeholder="https://api.example.com" autoComplete="off" spellCheck={false} />
              {errors.upstreamUrl && <p role="alert" className="mt-1 text-xs text-rose-500">{errors.upstreamUrl.message}</p>}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary">Cancel</button>
            <button disabled={busy} className="btn-primary">{busy ? 'Creating…' : 'Create project'}</button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={onDelete}
        busy={rowBusy}
        title="Delete project?"
        confirmLabel="Delete project"
        message={confirmDelete ? `Permanently deletes "${confirmDelete.name}" plus its endpoints, versions, keys, webhooks and request logs. This cannot be undone.` : ''}
      />
    </div>
  );
}
