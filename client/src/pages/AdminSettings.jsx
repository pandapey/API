import { useEffect, useState } from 'react';
import { Settings } from 'lucide-react';
import { adminService } from '../services/adminService.js';
import { useToast } from '../context/ToastContext.jsx';
import { extractError } from '../services/api.js';
import Skeleton from '../components/Skeleton.jsx';
import PageHeader from '../components/PageHeader.jsx';

export default function AdminSettings() {
  const toast = useToast();
  const [form, setForm] = useState({ rateLimit: '', retentionDays: '', maintenance: false });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await adminService.settings();
      const s = res?.settings ?? res ?? {};
      setForm({
        rateLimit: s.globalRateMax ?? s.defaultProjectRateLimit ?? '',
        retentionDays: s.logRetentionDays ?? '',
        maintenance: !!s.maintenanceMode,
      });
    } catch (e) {
      setLoadError(extractError(e, 'Failed to load settings'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const toNumOrUndef = (raw) => {
        if (raw === '' || raw === null || raw === undefined) return undefined;
        const n = Number(raw);
        return Number.isFinite(n) && n >= 0 ? n : undefined;
      };
      await adminService.updateSettings({
        // Server whitelist keys (adminController ALLOWED_SETTINGS): the client
        // previously sent rateLimit/retentionDays/maintenance — all rejected 400.
        // 0 is valid (unlimited) — must not be coerced to undefined.
        globalRateMax: toNumOrUndef(form.rateLimit),
        logRetentionDays: toNumOrUndef(form.retentionDays),
        maintenanceMode: !!form.maintenance,
      });
      toast.success('Settings saved');
    } catch (err) {
      toast.error(extractError(err, 'Save failed'));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <PageHeader icon={Settings} title="Platform settings" subtitle="Global defaults and maintenance mode." />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (loadError) {
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <PageHeader icon={Settings} title="Platform settings" subtitle="Global defaults and maintenance mode." />
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
          {loadError}
          <button onClick={load} className="btn-secondary ml-3 !py-1 !text-xs">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader icon={Settings} title="Platform settings" subtitle="Global defaults and maintenance mode." />
      <form onSubmit={save} className="card space-y-4 p-5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="set-rate" className="label">Default rate limit / min</label>
            <input id="set-rate" className="input" type="number" value={form.rateLimit} onChange={(e) => setForm((f) => ({ ...f, rateLimit: e.target.value }))} />
            <p className="form-hint">Applied to projects and keys without an explicit limit. 0 = unlimited.</p>
          </div>
          <div>
            <label htmlFor="set-retention" className="label">Log retention (days)</label>
            <input id="set-retention" className="input" type="number" value={form.retentionDays} onChange={(e) => setForm((f) => ({ ...f, retentionDays: e.target.value }))} />
            <p className="form-hint">Older request logs are pruned. 0 = keep forever.</p>
          </div>
        </div>
        <label htmlFor="set-maintenance" className="flex cursor-pointer items-center gap-2 text-sm">
          <input id="set-maintenance" type="checkbox" checked={form.maintenance} onChange={(e) => setForm((f) => ({ ...f, maintenance: e.target.checked }))} className="accent-indigo-600" />
          Maintenance mode (pause gateway writes)
        </label>
        <button disabled={busy} className="btn-primary" aria-busy={busy}>{busy ? 'Saving…' : 'Save settings'}</button>
      </form>
    </div>
  );
}
