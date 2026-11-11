import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Clock, RefreshCw } from 'lucide-react';
import { adminService } from '../services/adminService.js';
import { extractError } from '../services/api.js';
import Badge from '../components/Badge.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Skeleton from '../components/Skeleton.jsx';
import { ErrorState } from '../components/EmptyState.jsx';

function healthTone(name, val) {
  const raw = val?.status ?? val?.state ?? val?.value ?? val;
  const s = String(raw ?? '').toLowerCase();
  // metrics, not statuses — neutral
  if (name === 'time' || name === 'uptimeSec' || name === 'uptime' || name === 'dbState') return 'info';
  if (typeof val === 'number') return 'info';
  if (name === 'redis' && s.includes('fallback')) return 'warn';
  if (s.includes('ok') || s.includes('up') || val === true || val === 1 || s === '1') return 'ok';
  return 'bad';
}

export default function AdminHealth() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAll = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminService.health();
      setData(res);
    } catch (e) {
      setError(extractError(e, 'Health check failed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const raw = data?.services || data?.checks || data?.data || data;
  const services = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object'
      ? Object.entries(raw).filter(([k]) => !['time', 'uptimeSec', 'dbState'].includes(k))
      : [];

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Activity}
        title="System health"
        subtitle="Gateway, database and queue status."
        actions={<button onClick={fetchAll} className="btn-secondary !py-1.5 !text-xs" aria-label="Re-run health checks"><RefreshCw size={13} /> Re-check</button>}
      />
      {error && <ErrorState message={error} onRetry={fetchAll} />}
      {loading ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(Array.isArray(services) ? services : []).map((entry, i) => {
              const [name, val] = Array.isArray(entry) ? entry : [entry?.name || `service-${i + 1}`, entry?.status ?? entry?.value ?? entry];
              const tone = healthTone(name, val);
              const display = name === 'uptimeSec' ? `${val}s uptime` : (typeof val === 'object' ? val.status || val.state || 'ok' : String(val));
              const banner = tone === 'ok'
                ? 'from-emerald-500 via-teal-500 to-cyan-500'
                : tone === 'warn'
                  ? 'from-amber-500 via-orange-500 to-rose-400'
                  : 'from-slate-600 via-slate-500 to-indigo-500';
              const pill = tone === 'ok' ? '● Healthy' : tone === 'warn' ? '● Fallback' : '● Info';
              const hint = name === 'redis' && tone === 'warn'
                ? 'Running without Redis (in-memory fallback). Start redis:7 to get redis:up.'
                : name === 'time'
                  ? 'Server clock — informational.'
                  : name === 'uptimeSec'
                    ? 'Time since backend restart — informational.'
                    : name === 'db'
                      ? 'MongoDB connected.'
                      : null;
              return (
                <div key={i} className="card overflow-hidden p-0">
                  <div className={`bg-gradient-to-r ${banner} flex items-center justify-between p-4 text-white`}>
                    <p className="text-xs font-semibold uppercase tracking-widest text-white/85">{name}</p>
                    <span className="rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold backdrop-blur">{pill}</span>
                  </div>
                  <div className="flex items-center gap-3 p-4">
                    {tone === 'ok' && <CheckCircle2 className="text-emerald-500" size={22} />}
                    {tone === 'warn' && <AlertTriangle className="text-amber-500" size={22} />}
                    {tone === 'info' && <Clock className="text-indigo-400" size={22} />}
                    {tone === 'bad' && <Clock className="text-rose-500" size={22} />}
                    <div className="text-sm">
                      <Badge tone={tone === 'ok' ? 'green' : tone === 'warn' ? 'amber' : tone === 'info' ? 'slate' : 'red'}>{display}</Badge>
                      {hint && <p className="mt-1 text-[11px] text-slate-500">{hint}</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="card p-5">
            <h3 className="font-semibold">Raw health payload</h3>
            <pre className="mt-3 max-h-96 overflow-auto rounded-xl bg-slate-950 p-4 font-mono text-xs text-slate-200">{JSON.stringify(data, null, 2)}</pre>
          </div>
        </>
      )}
    </div>
  );
}
