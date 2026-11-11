import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAnalytics } from '../hooks/useAnalytics.js';
import { useProjects } from '../hooks/useProjects.js';
import { RANGES } from '../utils/constants.js';
import { formatDateShort } from '../utils/format.js';
import ChartCard from '../components/ChartCard.jsx';
import { SkeletonCard } from '../components/Skeleton.jsx';
import EmptyState, { ErrorState } from '../components/EmptyState.jsx';

const COLORS = ['#6366f1', '#22c55e', '#ef4444', '#f59e0b', '#06b6d4', '#a855f7'];

export default function Analytics() {
  const [sp, setSp] = useSearchParams();
  const { projects } = useProjects();
  const [range, setRange] = useState(sp.get('range') || '30d');
  const [projectId, setProjectId] = useState(sp.get('projectId') || '');
  const params = useMemo(() => {
    const p = { range };
    if (projectId) p.projectId = projectId;
    return p;
  }, [range, projectId]);

  const { timeseries, endpoints, status, latency, loading, error, refetch } = useAnalytics(params);

  const change = (k, v) => {
    if (k === 'range') setRange(v);
    if (k === 'projectId') setProjectId(v);
    const next = Object.fromEntries(sp.entries());
    if (v) next[k] = v;
    else delete next[k];
    setSp(next, { replace: true });
  };

  const ts = (timeseries || []).map((d) => ({
    date: formatDateShort(d.date || d.day || d.label),
    requests: d.requests ?? d.count ?? 0,
    latency: d.avgLatency ?? d.latency ?? d.p95 ?? 0,
  }));
  const ep = (endpoints || []).slice(0, 10).map((e, i) => ({
    name: (e.path || e.name || e.endpoint || `ep-${i}`).slice(0, 28),
    value: e.requests ?? e.count ?? 0,
  }));
  const st = (status || []).map((s, i) => ({ name: s.name || s.label || s.status || `s${i}`, value: s.value ?? s.count ?? 0 }));

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Analytics</h1>
          <p className="text-sm text-slate-500">Deep dive into traffic, errors and latency.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={projectId} onChange={(e) => change('projectId', e.target.value)} className="input !w-auto !py-1.5 !text-xs">
            <option value="">All projects</option>
            {projects.map((p) => <option key={p._id || p.id} value={p._id || p.id}>{p.name}</option>)}
          </select>
          {RANGES.filter((r) => r.value !== 'custom').map((r) => (
            <button key={r.value} onClick={() => change('range', r.value)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${range === r.value ? 'bg-brand-600 text-white' : 'border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900'}`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={refetch} />}
      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2">{[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}</div>
      ) : !ts.length && !ep.length ? (
        <EmptyState title="No analytics in this range" hint="Try a wider range or a different project." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="Throughput" subtitle={`${ts.length} buckets`} className="lg:col-span-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ts}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="requests" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Per-endpoint share" subtitle="Top 10">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={ep} dataKey="value" nameKey="name" outerRadius={95} label>
                  {ep.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Status distribution" subtitle="Response codes">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={st.length ? st : [{ name: 'no data', value: 0 }]}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#22c55e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Latency (avg ms)" subtitle="Response time trend" className="lg:col-span-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={(latency?.length ? latency : ts).map((l) => ({ date: l.date || formatDateShort(l.day || l.label), ms: l.latency ?? l.avgLatency ?? l.ms ?? l.avg ?? 0 }))}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="ms" stroke="#f59e0b" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}
    </div>
  );
}
