import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Activity, BarChart3, CheckCircle2, Clock, Gauge, XCircle,
} from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useAnalytics } from '../hooks/useAnalytics.js';
import { useProjects } from '../hooks/useProjects.js';
import { RANGES } from '../utils/constants.js';
import { formatDateShort, formatMs, formatNumber, formatPercent } from '../utils/format.js';
import StatCard from '../components/StatCard.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { SkeletonCard } from '../components/Skeleton.jsx';
import EmptyState, { ErrorState } from '../components/EmptyState.jsx';
import { getTheme } from '../components/charts/chartThemes.js';
import { ChartTooltip, trunc } from '../components/charts/ChartTooltip.jsx';

// Same locked design language as the Dashboard (single-hue indigo pro).
const THEME = getTheme('mono');

function toneForCode(code) {
  const n = parseInt(String(code), 10);
  if (!Number.isFinite(n)) return THEME.req;
  if (n >= 500) return THEME.err;
  if (n >= 400) return THEME.lat;
  if (n >= 200 && n < 300) return THEME.ok;
  return THEME.req;
}

/** Card band + chart well — same anatomy as the Dashboard charts. */
function ChartPanel({ title, value, sub, legend, delay = 0, className = '', children }) {
  return (
    <div className={`card card-hover fade-up overflow-hidden !p-0 ${className}`} style={{ '--reveal-delay': `${delay}ms` }}>
      <div className={`relative overflow-hidden p-5 ${THEME.header} text-white`}>
        {title === 'Traffic over time' && (
          <>
            <div className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full bg-white/15 blur-2xl" aria-hidden="true" />
            <div className="pointer-events-none absolute -bottom-16 left-1/3 h-40 w-40 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
          </>
        )}
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className={`text-[11px] font-bold uppercase tracking-[0.18em] ${THEME.headerTitle}`}>{title}</p>
            {value != null && (
              <p className={`mt-1 text-3xl font-extrabold tabular-nums tracking-tight ${THEME.headerValue}`}>{value}</p>
            )}
            {sub && <p className={`mt-0.5 text-xs ${THEME.headerSub}`}>{sub}</p>}
          </div>
          {legend && (
            <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold">
              {legend.map((l) => (
                <span
                  key={l.label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/70 px-2.5 py-1 text-slate-800 dark:border-white/15 dark:bg-white/10 dark:text-white"
                >
                  <span className="h-2 w-2 rounded-full shadow" style={{ background: l.color }} />
                  {l.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className={`h-[272px] w-full p-3 ${THEME.well}`}>
        {children}
      </div>
    </div>
  );
}

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

  const { overview, timeseries, endpoints, status, latency, loading, error, refetch } = useAnalytics(params);

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
    success: d.success ?? (d.count ?? d.requests ?? 0) - (d.errors ?? 0),
    failed: d.failed ?? d.errors ?? 0,
    latency: d.latency ?? d.avgLatency ?? 0,
  }));

  // Ranked endpoints for the list view (cleaner than a 10-slice pie).
  const ep = (endpoints || [])
    .slice()
    .sort((a, b) => (b.requests ?? b.count ?? 0) - (a.requests ?? a.count ?? 0))
    .slice(0, 6);
  const maxEp = Math.max(1, ...ep.map((e) => e.requests ?? e.count ?? 0));

  const st = (status || []).map((s) => ({
    name: String(s.name ?? s.status ?? ''),
    value: s.value ?? s.count ?? 0,
  }));
  const errorsTotal = st.filter((s) => parseInt(s.name, 10) >= 400).reduce((a, s) => a + s.value, 0);
  const totalFromStatus = st.reduce((a, s) => a + s.value, 0);

  const totalReq = overview?.total ?? ts.reduce((a, b) => a + (b.requests || 0), 0);
  // Fallback when overview has no avgLatency: request-weighted daily average.
  const avgLat = overview?.avgLatency ?? (totalReq > 0
    ? Math.round(ts.reduce((a, b) => a + (b.requests || 0) * (b.latency || 0), 0) / totalReq)
    : 0);
  const p95 = overview?.p95 ?? overview?.p95LatencyMs ?? 0;
  const successRate = totalReq > 0 ? (totalReq - errorsTotal) / totalReq : null;
  const busiest = ts.reduce((best, d) => ((d.requests || 0) > (best?.requests || 0) ? d : best), null);

  const latData = (latency?.length ? latency : ts).map((l) => ({
    date: l.date || formatDateShort(l.day || l.label),
    ms: l.latency ?? l.avgLatency ?? l.ms ?? l.avg ?? 0,
    p95: l.p95 || l.p95LatencyMs || null,
  }));
  const hasP95 = Array.isArray(latency) && latency.some((l) => l.p95);

  const empty = !ts.length && !ep.length && !st.length;

  return (
    <div className="space-y-5">
      <PageHeader
        icon={BarChart3}
        title="Analytics"
        subtitle="Deep dive into traffic, errors and latency."
        actions={
          <>
            <select
              aria-label="Filter analytics by project"
              value={projectId}
              onChange={(e) => change('projectId', e.target.value)}
              className="input !w-auto !py-2 !text-xs"
            >
              <option value="">All projects</option>
              {projects.map((p) => <option key={p._id || p.id} value={p._id || p.id}>{p.name}</option>)}
            </select>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Analytics range">
              {RANGES.filter((r) => r.value !== 'custom').map((r) => (
                <button
                  key={r.value}
                  onClick={() => change('range', r.value)}
                  aria-pressed={range === r.value}
                  className={`rounded-xl px-3 py-2 text-xs font-semibold transition active:scale-95 ${range === r.value
                    ? 'bg-gradient-to-r from-brand-600 to-violet-600 text-white shadow-pop'
                    : 'border border-slate-300 bg-white text-slate-600 hover:-translate-y-px dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'}`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </>
        }
      />

      {error && <ErrorState message={error} onRetry={refetch} />}

      {loading ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}</div>
          <div className="grid gap-4 lg:grid-cols-2">{[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}</div>
        </div>
      ) : empty ? (
        <EmptyState title="No analytics in this range" hint="Send some gateway requests, or try a wider range / different project." />
      ) : (
        <>
          {/* Summary tiles — same style as the Dashboard, no extra API call */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total requests" value={totalReq} icon={Activity} tone="brand" deltaLabel={busiest ? `peak ${busiest.date}` : undefined} />
            <StatCard
              label="Success rate"
              value={successRate != null ? formatPercent(successRate) : '—'}
              icon={CheckCircle2}
              tone="green"
            />
            <StatCard label="Errors (4xx/5xx)" value={errorsTotal} icon={XCircle} tone="red" deltaLabel={`${formatNumber(totalFromStatus)} responses logged`} />
            <StatCard label="Avg latency" value={formatMs(avgLat)} icon={Clock} tone="amber" deltaLabel={p95 ? `p95 ${formatMs(p95)}` : undefined} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Traffic over time — grouped histogram like the Dashboard */}
            <ChartPanel
              title="Traffic over time"
              value={formatNumber(totalReq)}
              sub={`${range} · ${ts.length} buckets${busiest ? ` · peak ${busiest.date}` : ''}`}
              className="lg:col-span-2"
              legend={[
                { label: 'Requests', color: THEME.req },
                { label: 'Success', color: THEME.ok },
                { label: 'Failed', color: THEME.err },
              ]}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ts} margin={{ top: 14, right: 14, left: -6, bottom: 0 }} barCategoryGap="22%" barGap={3}>
                  <CartesianGrid stroke={THEME.grid} strokeDasharray="3 8" opacity={THEME.gridOpacity} vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} tickLine={false} axisLine={{ stroke: THEME.grid, strokeOpacity: 0.7 }} dy={8} minTickGap={28} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} tickLine={false} axisLine={false} allowDecimals={false} width={40} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: THEME.req, fillOpacity: 0.08 }} />
                  <Bar dataKey="requests" name="Requests" fill={THEME.req} radius={[5, 5, 0, 0]} maxBarSize={26} animationDuration={900} animationEasing="ease-out" />
                  <Bar dataKey="success" name="Success" fill={THEME.ok} radius={[5, 5, 0, 0]} maxBarSize={26} animationDuration={900} animationEasing="ease-out" />
                  <Bar dataKey="failed" name="Failed" fill={THEME.err} radius={[5, 5, 0, 0]} maxBarSize={26} animationDuration={900} animationEasing="ease-out" />
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>

            {/* Top endpoints — ranked list with share bars (replaces the noisy pie) */}
            <div className="card card-hover fade-up !p-0" style={{ '--reveal-delay': '90ms' }}>
              <div className={`relative overflow-hidden p-5 ${THEME.header} text-white`}>
                <div className="relative flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className={`text-[11px] font-bold uppercase tracking-[0.18em] ${THEME.headerTitle}`}>Top endpoints</p>
                    <p className={`mt-1 text-3xl font-extrabold tabular-nums tracking-tight ${THEME.headerValue}`}>{formatNumber(ep[0]?.requests ?? 0)}</p>
                    <p className={`mt-0.5 text-xs ${THEME.headerSub}`}>{ep[0] ? `most called · ${trunc(ep[0].endpoint || ep[0].path, 26)}` : 'no endpoint traffic'}</p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-slate-800 dark:border-white/15 dark:bg-white/10 dark:text-white">
                    <Gauge size={12} /> {ep.length} of {(endpoints || []).length}
                  </span>
                </div>
              </div>
              <div className="min-h-[272px] space-y-3 p-5">
                {ep.map((e, i) => {
                  const count = e.requests ?? e.count ?? 0;
                  const pct = Math.round((count / maxEp) * 100);
                  return (
                    <div key={`${e.method}-${e.endpoint || e.path}-${i}`}>
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="min-w-0 truncate font-mono text-xs font-semibold text-slate-700 dark:text-slate-200" title={e.endpoint || e.path}>
                          {e.method ? `${e.method} ` : ''}{e.endpoint || e.path}
                        </p>
                        <p className="shrink-0 text-xs tabular-nums text-slate-500 dark:text-slate-400">
                          {formatNumber(count)}
                          {e.avgLatencyMs ? ` · ${formatMs(e.avgLatencyMs)}` : ''}
                        </p>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" role="img" aria-label={`${count} requests, ${pct}% of the busiest endpoint`}>
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-500 transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Status distribution — HTTP-tone colored bars */}
            <ChartPanel
              title="Status codes"
              value={formatNumber(totalFromStatus)}
              sub={errorsTotal ? `${formatPercent(errorsTotal / Math.max(1, totalFromStatus))} error rate` : 'all responses succeeded'}
              delay={180}
              legend={[
                { label: '2xx ok', color: THEME.ok },
                { label: '4xx client', color: THEME.lat },
                { label: '5xx server', color: THEME.err },
              ]}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={st.length ? st : [{ name: '—', value: 0 }]} margin={{ top: 14, right: 14, left: -6, bottom: 0 }}>
                  <CartesianGrid stroke={THEME.grid} strokeDasharray="3 8" opacity={THEME.gridOpacity} vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} tickLine={false} axisLine={{ stroke: THEME.grid, strokeOpacity: 0.7 }} dy={8} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} tickLine={false} axisLine={false} allowDecimals={false} width={40} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: THEME.req, fillOpacity: 0.08 }} />
                  <Bar dataKey="value" name="Responses" radius={[6, 6, 0, 0]} maxBarSize={44} animationDuration={900} animationEasing="ease-out">
                    {(st.length ? st : [{ name: '—' }]).map((entry, i) => (
                      <Cell key={i} fill={toneForCode(entry.name)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>

            {/* Latency — avg + dashed p95, themed like the Dashboard */}
            <ChartPanel
              title="Latency trend"
              value={formatMs(avgLat)}
              sub={`avg response time${p95 ? ` · p95 ${formatMs(p95)}` : ''} · lower is better`}
              className="lg:col-span-2"
              delay={240}
              legend={[
                { label: 'Avg ms', color: THEME.lat },
                ...(hasP95 ? [{ label: 'p95 ms', color: THEME.bars[5] || '#a855f7' }] : []),
              ]}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={latData} margin={{ top: 14, right: 14, left: -6, bottom: 0 }}>
                  <CartesianGrid stroke={THEME.grid} strokeDasharray="3 8" opacity={THEME.gridOpacity} vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} tickLine={false} axisLine={{ stroke: THEME.grid, strokeOpacity: 0.7 }} dy={8} minTickGap={28} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} tickLine={false} axisLine={false} width={48} />
                  <Tooltip content={<ChartTooltip suffix=" ms" />} />
                  {hasP95 && (
                    <Line type="monotone" dataKey="p95" name="p95" stroke={THEME.bars[5] || '#a855f7'} strokeWidth={THEME.strokeWidth} dot={false} strokeDasharray="6 4" animationDuration={900} />
                  )}
                  <Line type="monotone" dataKey="ms" name="Avg ms" stroke={THEME.lat} strokeWidth={THEME.strokeWidth} dot={false} animationDuration={900} animationEasing="ease-out" />
                </LineChart>
              </ResponsiveContainer>
            </ChartPanel>
          </div>
        </>
      )}
    </div>
  );
}
