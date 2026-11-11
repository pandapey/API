import { useEffect, useState } from 'react';
import { adminService } from '../services/adminService.js';
import { useToast } from '../context/ToastContext.jsx';
import { extractError } from '../services/api.js';
import Skeleton from '../components/Skeleton.jsx';

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
        rateLimit: s.rateLimit ?? s.defaultRateLimit ?? s.globalRateMax ?? '',
        retentionDays: s.retentionDays ?? s.logRetentionDays ?? '',
        maintenance: !!(s.maintenance ?? s.maintenanceMode),
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
        // 0 is valid (unlimited) — must not be coerced to undefined.
        rateLimit: toNumOrUndef(form.rateLimit),
        retentionDays: toNumOrUndef(form.retentionDays),
        maintenance: form.maintenance,
      });
      toast.success('Settings saved');
    } catch (err) {
      toast.error(extractError(err, 'Save failed'));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Skeleton className="h-64 w-full" />;
  if (loadError) {
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Platform settings</h1>
          <p className="text-sm text-slate-500">Global defaults and maintenance mode.</p>
        </div>
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
          {loadError}
          <button onClick={load} className="btn-secondary ml-3 !py-1 !text-xs">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Platform settings</h1>
        <p className="text-sm text-slate-500">Global defaults and maintenance mode.</p>
      </div>
      <form onSubmit={save} className="card space-y-4 p-5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Default rate limit / min</label>
            <input className="input" type="number" value={form.rateLimit} onChange={(e) => setForm((f) => ({ ...f, rateLimit: e.target.value }))} />
          </div>
          <div>
            <label className="label">Log retention (days)</label>
            <input className="input" type="number" value={form.retentionDays} onChange={(e) => setForm((f) => ({ ...f, retentionDays: e.target.value }))} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.maintenance} onChange={(e) => setForm((f) => ({ ...f, maintenance: e.target.checked }))} className="accent-indigo-600" />
          Maintenance mode (pause gateway writes)
        </label>
        <button disabled={busy} className="btn-primary">{busy ? 'Saving…' : 'Save settings'}</button>
      </form>
    </div>
  );
}
