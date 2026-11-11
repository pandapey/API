import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';
import { useProjects } from '../hooks/useProjects.js';
import { projectService } from '../services/projectService.js';
import { projectSchema } from '../schemas/projectSchema.js';
import { useToast } from '../context/ToastContext.jsx';
import { extractError } from '../services/api.js';
import Table from '../components/Table.jsx';
import Modal from '../components/Modal.jsx';
import { formatDate } from '../utils/format.js';
import { ErrorState } from '../components/EmptyState.jsx';

export default function Projects() {
  const { projects, loading, error, refetch } = useProjects();
  const toast = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ resolver: zodResolver(projectSchema) });

  const onCreate = async (v) => {
    setBusy(true);
    try {
      await projectService.create(v);
      toast.success('Project created');
      setOpen(false);
      reset();
      refetch();
    } catch (e) {
      toast.error(extractError(e, 'Could not create project'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Projects</h1>
          <p className="text-sm text-slate-500">Group endpoints, keys and webhooks per API.</p>
        </div>
        <button onClick={() => setOpen(true)} className="btn-primary"><Plus size={16} /> New project</button>
      </div>

      {error && <ErrorState message={error} onRetry={refetch} />}

      <Table
        loading={loading}
        data={projects}
        emptyTitle="No projects yet"
        emptyHint="Create your first project to start routing gateway traffic."
        onRowClick={(r) => navigate(`/projects/${r._id || r.id}`)}
        columns={[
          { key: 'name', title: 'Project', render: (r) => (
            <Link to={`/projects/${r._id || r.id}`} className="font-semibold text-brand-600 hover:underline">{r.name}</Link>
          ) },
          { key: 'basePath', title: 'Base path', render: (r) => <code className="font-mono text-xs">{r.basePath || '/'}</code> },
          { key: 'description', title: 'Description', render: (r) => <span className="max-w-[260px] truncate text-slate-500">{r.description || '—'}</span> },
          { key: 'createdAt', title: 'Created', render: (r) => <span className="text-xs text-slate-500">{formatDate(r.createdAt)}</span> },
        ]}
      />

      <Modal open={open} onClose={() => setOpen(false)} title="New project">
        <form onSubmit={handleSubmit(onCreate)} className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input className="input" {...register('name')} placeholder="Weather API" />
            {errors.name && <p className="mt-1 text-xs text-rose-500">{errors.name.message}</p>}
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" rows={3} {...register('description')} placeholder="What does this API do?" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Base path</label>
              <input className="input font-mono" {...register('basePath')} placeholder="/weather" />
              {errors.basePath && <p className="mt-1 text-xs text-rose-500">{errors.basePath.message}</p>}
            </div>
            <div>
              <label className="label">Upstream URL</label>
              <input className="input font-mono" {...register('upstreamUrl')} placeholder="https://api.example.com" />
              {errors.upstreamUrl && <p className="mt-1 text-xs text-rose-500">{errors.upstreamUrl.message}</p>}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary">Cancel</button>
            <button disabled={busy} className="btn-primary">{busy ? 'Creating…' : 'Create project'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
