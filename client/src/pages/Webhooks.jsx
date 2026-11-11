import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Send, Trash2 } from 'lucide-react';
import { webhookService } from '../services/webhookService.js';
import { webhookSchema } from '../schemas/webhookSchema.js';
import { useProjects } from '../hooks/useProjects.js';
import { useToast } from '../context/ToastContext.jsx';
import { extractError } from '../services/api.js';
import Table from '../components/Table.jsx';
import Modal from '../components/Modal.jsx';
import Badge from '../components/Badge.jsx';

const EVENTS = ['api.request', 'api.error'];

function arr(x) {
  if (Array.isArray(x)) return x;
  return x?.items || x?.webhooks || x?.data || [];
}

export default function Webhooks({ embedded = false, projectId: fixedProjectId }) {
  const { projects } = useProjects();
  const toast = useToast();
  const [projectId, setProjectId] = useState(fixedProjectId || '');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(webhookSchema),
    defaultValues: { url: '', events: [...EVENTS], secret: '', isActive: true },
  });
  const selectedEvents = watch('events') || [];

  useEffect(() => {
    if (fixedProjectId) setProjectId(fixedProjectId);
    else if (projects.length && !projectId) setProjectId(projects[0]._id || projects[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, fixedProjectId]);

  const fetchAll = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await webhookService.list(projectId);
      setItems(arr(res));
    } catch (e) {
      toast.error(extractError(e, 'Failed to load webhooks'));
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const onCreate = async (v) => {
    const events = Array.isArray(v.events) ? v.events.filter(Boolean) : [v.events].filter(Boolean);
    if (!events.length) return toast.error('Select at least one event');
    setBusy(true);
    try {
      await webhookService.create(projectId, { url: v.url, secret: v.secret || undefined, isActive: v.isActive ?? true, events });
      toast.success('Webhook added');
      setOpen(false);
      reset({ url: '', events: [...EVENTS], secret: '', isActive: true });
      fetchAll();
    } catch (e) {
      toast.error(extractError(e, 'Could not create webhook'));
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (row) => {
    if (!confirm('Delete this webhook?')) return;
    try {
      await webhookService.remove(projectId, row._id || row.id);
      toast.success('Webhook deleted');
      fetchAll();
    } catch (e) {
      toast.error(extractError(e, 'Delete failed'));
    }
  };

  const onTest = async (row) => {
    try {
      await webhookService.test(projectId, row._id || row.id);
      toast.success('Test event dispatched');
    } catch (e) {
      toast.error(extractError(e, 'Test failed'));
    }
  };

  return (
    <div className="space-y-4">
      {!embedded && (
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Webhooks</h1>
            <p className="text-sm text-slate-500">Signed POST callbacks for gateway events.</p>
          </div>
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="input !w-auto">
            {projects.map((p) => <option key={p._id || p.id} value={p._id || p.id}>{p.name}</option>)}
          </select>
        </div>
      )}
      <div className="flex justify-end">
        <button disabled={!projectId} onClick={() => setOpen(true)} className="btn-primary"><Plus size={16} /> New webhook</button>
      </div>
      <Table
        loading={loading}
        data={items}
        emptyTitle="No webhooks"
        emptyHint="Get notified when keys rotate or errors spike."
        columns={[
          { key: 'url', title: 'URL', render: (r) => <code className="font-mono text-xs">{r.url}</code> },
          { key: 'events', title: 'Events', render: (r) => (
            <span className="flex max-w-[280px] flex-wrap gap-1">{(r.events || []).map((e) => <Badge key={e} tone="purple">{e}</Badge>)}</span>
          ) },
          { key: 'active', title: 'Active', render: (r) => <Badge tone={(r.isActive ?? r.active) === false ? 'slate' : 'green'}>{(r.isActive ?? r.active) === false ? 'off' : 'on'}</Badge> },
          { key: 'actions', title: '', render: (r) => (
            <span className="flex gap-1">
              <button onClick={() => onTest(r)} className="rounded-lg p-1.5 text-brand-600 hover:bg-brand-50" title="Send test"><Send size={15} /></button>
              <button onClick={() => onDelete(r)} className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50"><Trash2 size={15} /></button>
            </span>
          ) },
        ]}
      />
      <Modal open={open} onClose={() => setOpen(false)} title="New webhook">
        <form onSubmit={handleSubmit(onCreate)} className="space-y-4">
          <div>
            <label htmlFor="wh-url" className="label">Payload URL</label>
            <input id="wh-url" className="input font-mono" {...register('url')} placeholder="https://your.app/hooks/devapi" />
            {errors.url && <p role="alert" className="mt-1 text-xs text-rose-500">{errors.url.message}</p>}
          </div>
          <div>
            <span id="wh-events-label" className="label">Events</span>
            <div role="group" aria-labelledby="wh-events-label" className="grid grid-cols-2 gap-2">
              {EVENTS.map((e) => {
                const checked = selectedEvents.includes(e);
                return (
                  <label key={e} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono transition hover:border-brand-300 dark:border-slate-700 dark:hover:border-brand-700">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        const next = checked ? selectedEvents.filter((x) => x !== e) : [...selectedEvents, e];
                        setValue('events', next, { shouldValidate: true });
                      }}
                      className="accent-indigo-600"
                    /> {e}
                  </label>
                );
              })}
            </div>
            {errors.events && <p role="alert" className="mt-1 text-xs text-rose-500">{errors.events.message}</p>}
          </div>
          <div>
            <label htmlFor="wh-secret" className="label">Signing secret (optional)</label>
            <input id="wh-secret" className="input font-mono" {...register('secret')} placeholder="whsec_…" />
            {errors.secret && <p role="alert" className="mt-1 text-xs text-rose-500">{errors.secret.message}</p>}
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary">Cancel</button>
            <button disabled={busy} className="btn-primary">{busy ? 'Saving…' : 'Create'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
