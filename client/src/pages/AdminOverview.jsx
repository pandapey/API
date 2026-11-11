import { useEffect, useState } from 'react';
import { Activity, FolderKanban, KeyRound, Users } from 'lucide-react';
import { adminService } from '../services/adminService.js';
import { useToast } from '../context/ToastContext.jsx';
import { extractError } from '../services/api.js';
import StatCard from '../components/StatCard.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { SkeletonCard } from '../components/Skeleton.jsx';
import { ErrorState } from '../components/EmptyState.jsx';

export default function AdminOverview() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [res, a] = await Promise.all([
        adminService.overview(),
        adminService.audit({ limit: 10 }).catch((e) => { console.error('[admin audit failed]', e?.response?.data || e.message); return []; }),
      ]);
      setData(res?.stats ?? res?.data ?? res);
      const arr = Array.isArray(a) ? a : a?.items || a?.data || [];
      setAudit(arr);
    } catch (e) {
      console.error('[AdminOverview failed]', e?.response?.data || e);
      setError(extractError(e, 'Failed to load admin overview'));
      toast.error(extractError(e, 'Failed to load admin overview'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-5">
      <PageHeader icon={Activity} title="Admin overview" subtitle="Platform-wide health at a glance." />
      {error && <ErrorState message={error} onRetry={load} />}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}</div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total users" value={data?.users ?? data?.totalUsers ?? 0} icon={Users} />
            <StatCard label="Total projects" value={data?.projects ?? data?.totalProjects ?? 0} icon={FolderKanban} />
            <StatCard label="Total requests" value={data?.requests ?? data?.totalRequests ?? 0} icon={Activity} />
            <StatCard label="Active keys" value={data?.keys ?? data?.activeKeys ?? 0} icon={KeyRound} />
          </div>
          <div className="card p-5">
            <h3 className="font-semibold text-slate-900 dark:text-white">Recent admin audit trail</h3>
            {audit.length ? (
              <ul className="mt-3 space-y-2 text-xs">
                {audit.map((a) => (
                  <li key={a._id || a.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 font-mono dark:bg-slate-800">
                    <span className="font-semibold text-brand-600">{a.subject}</span>
                    <span className="text-slate-500">{a.body}</span>
                    <span className="ml-auto text-slate-400">{a.createdAt ? new Date(a.createdAt).toLocaleString() : ''}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-slate-500">No admin actions yet — suspend/role/settings changes appear here.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
