import { useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, CheckCircle2, Clock, Gauge, KeyRound, TrendingUp, XCircle,
} from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Cell,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useAnalytics } from '../hooks/useAnalytics.js';
import { RANGES } from '../utils/constants.js';
import { formatDateShort, formatMs, formatNumber } from '../utils/format.js';
import StatCard from '../components/StatCard.jsx';
import { SkeletonCard } from '../components/Skeleton.jsx';
import EmptyState, { ErrorState } from '../components/EmptyState.jsx';
import { getTheme } from '../components/charts/chartThemes.js';

function ChartTooltip({ active, payload, label, suffix = '' }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-[168px] rounded-2xl border border-white/40 bg-white/90 px-3.5 py-3 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/90">
      {label != null && label !== '' && (
        <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{label}</p>
      )}
      <div className="space-y-1.5">
        {payload.map((p) => (
          <div key={p.dataKey || p.name} className="flex items-center gap-2 text-xs">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full shadow-sm ring-2 ring-white/60 dark:ring-black/30"
              style={{ background: p.color || p.payload?.fill || p.stroke || '#6366f1' }}
            />
            <span className="font-medium text-slate-500 dark:text-slate-400">{p.name}</span>
            <span className="ml-auto pl-4 font-extrabold tabular-nums text-slate-900 dark:text-white">
              {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}{suffix}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function trunc(s, n = 22) {
  const t = String(s ?? '');
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

function normalizeOverview(o) {
  if (!o) return null;
  return {
    total: o.total ?? o.totalRequests ?? 0,
    today: o.today ?? o.todayRequests ?? 0,
    month: o.month ?? o.monthRequests ?? o.total ?? 0,
    success: o.success ?? o.successCount ?? 0,
    failed: o.failed ?? o.failedCount ?? o.errors ?? 0,
    avgLatency: o.avgLatency ?? o.avgLatencyMs ?? o.p50 ?? 0,
    activeKeys: o.activeKeys ?? o.keys ?? 0,
    rateLimited: o.rateLimited ?? o.throttled ?? 0,
    mostUsed: o.mostUsed ?? o.topEndpoint ?? null,
    successRate: o.successRate ?? (o.total ? (o.success ?? 0) / o.total : null),
  };
}

export default function Dashboard() {
  const [range, setRange] = useState('7d');
  const [custom, setCustom] = useState({ from: '', to: '' });
  // Locked chart design: Mono (single-hue indigo pro)
  const theme = getTheme('mono');
  const params = useMemo(
    () => (range === 'custom' ? { range, ...custom } : { range }),
    [range, custom]
  );
  const { overview, timeseries, endpoints, status, latency, loading, error, refetch } = useAnalytics(params);

  const ov = normalizeOverview(overview);

  const tsData = (timeseries || []).map((d) => ({
    date: formatDateShort(d.date || d.day || d.label),
    requests: d.requests ?? d.count ?? d.total ?? 0,
    success: d.success ?? d.ok ?? 0,
    failed: d.failed ?? d.errors ?? 0,
  }));

  const statusData = (status?.length ? status : [
    { name: 'Success', value: ov?.success ?? 0 },
    { name: 'Failed', value: ov?.failed ?? 0 },
  ]).map((s, i) => ({
    name: s.name || s.label || s.status || `s${i}`,
    value: s.value ?? s.count ?? 0,
  }));

  const endpointData = (endpoints || []).slice(0, 8).map((e) => ({
    name: typeof e === 'string' ? e : e.path || e.endpoint || e.name,
    requests: e.requests ?? e.count ?? 1,
  }));

  const latencyData = (latency?.length ? latency : tsData).map((l) => ({
    date: l.date || formatDateShort(l.day || l.label),
    latency: l.latency ?? l.avgLatency ?? l.avgLatencyMs ?? l.p95 ?? l.avg ?? l.ms ?? 0,
  }));
  const totalReq = ov?.total ?? tsData.reduce((a, b) => a + (b.requests || 0), 0);
  const avgLat = ov?.avgLatency ?? (latencyData.length ? Math.round(latencyData.reduce((a, b) => a + (b.latency || 0), 0) / latencyData.length) : 0);
  const peakDay = tsData.reduce((best, d) => ((d.requests || 0) > (best?.requests || 0) ? d : best), null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Live traffic across all your projects.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Analytics range">
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              aria-pressed={range === r.value}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${range === r.value ? 'bg-gradient-to-r from-brand-600 to-violet-600 text-white shadow-pop' : 'border border-slate-300 bg-white text-slate-600 hover:-translate-y-px dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'}`}
            >
              {r.label}
            </button>
          ))}
          {range === 'custom' && (
            <span className="flex items-center gap-1.5">
              <label className="sr-only" htmlFor="dash-from">From date</label>
              <input id="dash-from" type="date" className="input !w-auto !py-1.5 !text-xs" value={custom.from} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} />
              <label className="sr-only" htmlFor="dash-to">To date</label>
              <input id="dash-to" type="date" className="input !w-auto !py-1.5 !text-xs" value={custom.to} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} />
            </span>
          )}
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={refetch} />}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : !ov && !tsData.length ? (
        <EmptyState title="No traffic yet" hint="Create a project, issue an API key and send your first gateway request to see analytics here." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total requests" value={ov?.total ?? 0} icon={Activity} tone="brand" />
            <StatCard label="Today" value={ov?.today ?? 0} icon={TrendingUp} tone="green" />
            <StatCard label="This month" value={ov?.month ?? 0} icon={CheckCircle2} tone="slate" />
            <StatCard label="Success" value={ov?.success ?? 0} icon={CheckCircle2} tone="green" />
            <StatCard label="Failed" value={ov?.failed ?? 0} icon={XCircle} tone="red" />
            <StatCard label="Avg latency" value={formatMs(ov?.avgLatency)} icon={Clock} tone="amber" />
            <StatCard label="Active keys" value={ov?.activeKeys ?? 0} icon={KeyRound} tone="brand" />
            <StatCard label="Rate-limited" value={ov?.rateLimited ?? 0} icon={AlertTriangle} tone="amber" />
          </div>

          {(ov?.mostUsed || ov?.successRate !== null) && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="card flex items-center gap-3 p-4">
                <span className="rounded-lg bg-brand-600/10 p-2 text-brand-600"><Gauge size={18} /></span>
                <div className="text-sm">
                  <p className="text-slate-500">Most used endpoint</p>
                  <p className="font-mono font-semibold text-slate-900 dark:text-white">{typeof ov.mostUsed === 'string' ? ov.mostUsed : ov.mostUsed?.path || ov.mostUsed?.endpoint || '—'}</p>
                </div>
              </div>
              <div className="card flex items-center gap-3 p-4">
                <span className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600"><CheckCircle2 size={18} /></span>
                <div className="text-sm">
                  <p className="text-slate-500">Success rate</p>
                  <p className="font-semibold text-slate-900 dark:text-white">{ov?.successRate != null ? `${(Number(ov.successRate) * (Number(ov.successRate) <= 1 ? 100 : 1)).toFixed(1)}%` : '—'}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Requests over time — histogram */}
            <div className="card card-hover fade-up overflow-hidden !p-0">
              <div className={`relative overflow-hidden p-5 ${theme.header} text-white`}>
                <>
                  <div className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full bg-white/15 blur-2xl" aria-hidden="true" />
                  <div className="pointer-events-none absolute -bottom-16 left-1/3 h-40 w-40 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
                </>
                <div className="relative flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className={`text-[11px] font-bold uppercase tracking-[0.18em] ${theme.headerTitle}`}>Requests over time</p>
                    <p className={`mt-1 text-3xl font-extrabold tabular-nums tracking-tight ${theme.headerValue}`}>{formatNumber(totalReq)}</p>
                    <p className={`mt-0.5 text-xs ${theme.headerSub}`}>{range} · all projects{peakDay ? ` · peak ${peakDay.date}` : ''} · histogram · {theme.label}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold text-slate-800 dark:text-white">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/70 px-2.5 py-1 text-slate-800 dark:border-white/15 dark:bg-white/10 dark:text-white"><span className="h-2 w-2 rounded-full shadow" style={{ background: theme.req }} /> Requests</span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/70 px-2.5 py-1 text-slate-800 dark:border-white/15 dark:bg-white/10 dark:text-white"><span className="h-2 w-2 rounded-full shadow" style={{ background: theme.ok }} /> Success</span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/70 px-2.5 py-1 text-slate-800 dark:border-white/15 dark:bg-white/10 dark:text-white"><span className="h-2 w-2 rounded-full shadow" style={{ background: theme.err }} /> Failed</span>
                  </div>
                </div>
              </div>
              <div className={`h-[272px] w-full p-3 ${theme.well}`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tsData} margin={{ top: 14, right: 14, left: -6, bottom: 0 }} barCategoryGap="22%" barGap={3}>
                  <CartesianGrid stroke={theme.grid} strokeDasharray="3 8" opacity={theme.gridOpacity} vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} tickLine={false} axisLine={{ stroke: theme.grid, strokeOpacity: 0.7 }} dy={8} minTickGap={28} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} tickLine={false} axisLine={false} allowDecimals={false} width={40} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: theme.req, fillOpacity: 0.08 }} />
                  <Bar dataKey="requests" name="Requests" fill={theme.req} radius={[5, 5, 0, 0]} maxBarSize={26} animationDuration={900} animationEasing="ease-out" />
                  <Bar dataKey="success" name="Success" fill={theme.ok} radius={[5, 5, 0, 0]} maxBarSize={26} animationDuration={900} animationEasing="ease-out" />
                  <Bar dataKey="failed" name="Failed" fill={theme.err} radius={[5, 5, 0, 0]} maxBarSize={26} animationDuration={900} animationEasing="ease-out" />
                </BarChart>
              </ResponsiveContainer>
              </div>
            </div>
            {/* Success vs failed — theme-aware donut */}
            <div className="card card-hover fade-up overflow-hidden !p-0" style={{ '--reveal-delay': '90ms' }}>
              <div className={`relative overflow-hidden p-5 ${theme.header} text-white`}>
                <div className="relative flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className={`text-[11px] font-bold uppercase tracking-[0.18em] ${theme.headerTitle}`}>Success vs failed</p>
                    <p className={`mt-1 text-3xl font-extrabold tabular-nums tracking-tight ${theme.headerValue}`}>{formatNumber((ov?.success ?? 0) + (ov?.failed ?? 0))}</p>
                    <p className={`mt-0.5 text-xs ${theme.headerSub}`}>
                      {ov?.successRate != null ? `${(Number(ov.successRate) * (Number(ov.successRate) <= 1 ? 100 : 1)).toFixed(1)}% success rate` : 'Outcome mix'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold text-slate-800 dark:text-white">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/70 px-2.5 py-1 text-slate-800 dark:border-white/15 dark:bg-white/10 dark:text-white"><span className="h-2 w-2 rounded-full shadow" style={{ background: theme.ok }} /> Success {formatNumber(ov?.success ?? 0)}</span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/70 px-2.5 py-1 text-slate-800 dark:border-white/15 dark:bg-white/10 dark:text-white"><span className="h-2 w-2 rounded-full shadow" style={{ background: theme.err }} /> Failed {formatNumber(ov?.failed ?? 0)}</span>
                  </div>
                </div>
              </div>
              <div className={`relative h-[272px] w-full p-3 ${theme.well}`}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    <linearGradient id="gPieOk" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor={theme.pieOk[0]} />
                      <stop offset="100%" stopColor={theme.pieOk[1] || theme.pieOk[0]} />
                    </linearGradient>
                    <linearGradient id="gPieErr" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor={theme.pieErr[0]} />
                      <stop offset="100%" stopColor={theme.pieErr[1] || theme.pieErr[0]} />
                    </linearGradient>
                  </defs>
                  <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={68} outerRadius={100} paddingAngle={5} cornerRadius={10} strokeWidth={2} stroke="#fff" animationDuration={1000} animationEasing="ease-out">
                    {statusData.map((s, i) => {
                      const n = String(s.name || '').toLowerCase();
                      const fill = n.includes('fail') || n.includes('error') || n.includes('5xx') ? 'url(#gPieErr)' : 'url(#gPieOk)';
                      return <Cell key={i} fill={fill} style={{ filter: 'drop-shadow(0 6px 12px rgba(16,24,40,.25))' }} />;
                    })}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <div className="rounded-2xl border border-slate-200/70 bg-white/85 px-4 py-2 text-center shadow-lg backdrop-blur dark:border-white/10 dark:bg-slate-900/85">
                  <p className="text-2xl font-extrabold tabular-nums tracking-tight text-slate-900 dark:text-white">{ov?.successRate != null ? `${(Number(ov.successRate) * (Number(ov.successRate) <= 1 ? 100 : 1)).toFixed(1)}%` : formatNumber(ov?.success ?? 0)}</p>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">success</p>
                </div>
              </div>
              </div>
            </div>
            {/* Endpoint usage — theme-aware bars */}
            <div className="card card-hover fade-up overflow-hidden !p-0 lg:col-span-1" style={{ '--reveal-delay': '160ms' }}>
              <div className={`relative overflow-hidden p-5 ${theme.header} text-white`}>
                <div className="relative flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className={`text-[11px] font-bold uppercase tracking-[0.18em] ${theme.headerTitle}`}>Endpoint usage</p>
                    <p className={`mt-1 text-3xl font-extrabold tabular-nums tracking-tight ${theme.headerValue}`}>{endpointData.length} <span className="text-sm font-semibold">endpoints</span></p>
                    <p className={`mt-0.5 text-xs ${theme.headerSub}`}>Top endpoints by volume</p>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-[11px] font-bold tracking-wide text-slate-800 dark:border-white/15 dark:bg-white/10 dark:text-white">TOP {Math.min(endpointData.length, 8)}</span>
                </div>
              </div>
              <div className={`h-[272px] w-full p-3 ${theme.well}`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={endpointData} layout="vertical" margin={{ top: 6, right: 18, left: 8, bottom: 0 }} barCategoryGap="24%">
                  <CartesianGrid stroke={theme.grid} strokeDasharray="3 8" opacity={theme.gridOpacity} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" width={148} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} tickLine={false} axisLine={false} tickFormatter={(v) => trunc(v, 20)} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: theme.req, fillOpacity: 0.08 }} />
                  <Bar dataKey="requests" name="Requests" radius={[6, 12, 12, 6]} background={{ fill: theme.grid, fillOpacity: 0.15, radius: 8 }} animationDuration={1000} animationEasing="ease-out" maxBarSize={24}>
                    {endpointData.map((_, i) => (
                      <Cell key={i} fill={theme.bars[i % theme.bars.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              </div>
            </div>
            {/* Latency trend — histogram */}
            <div className="card card-hover fade-up overflow-hidden !p-0" style={{ '--reveal-delay': '230ms' }}>
              <div className={`relative overflow-hidden p-5 ${theme.header} text-white`}>
                <div className="relative flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className={`text-[11px] font-bold uppercase tracking-[0.18em] ${theme.headerTitle}`}>Latency trend</p>
                    <p className={`mt-1 text-3xl font-extrabold tabular-nums tracking-tight ${theme.headerValue}`}>{formatMs(avgLat)} <span className="text-sm font-semibold">avg</span></p>
                    <p className={`mt-0.5 text-xs ${theme.headerSub}`}>Average response time per bucket · histogram · lower is better</p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-[11px] font-bold text-slate-800 dark:border-white/15 dark:bg-white/10 dark:text-white"><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ background: theme.lat }} /><span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: theme.lat }} /></span> LIVE ms</span>
                </div>
              </div>
              <div className={`h-[272px] w-full p-3 ${theme.well}`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={latencyData} margin={{ top: 14, right: 14, left: -4, bottom: 0 }} barCategoryGap="28%">
                  <CartesianGrid stroke={theme.grid} strokeDasharray="3 8" opacity={theme.gridOpacity} vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} tickLine={false} axisLine={{ stroke: theme.grid, strokeOpacity: 0.7 }} dy={8} minTickGap={28} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}ms`} width={52} />
                  <Tooltip content={<ChartTooltip suffix=" ms" />} cursor={{ fill: theme.lat, fillOpacity: 0.12 }} />
                  <Bar dataKey="latency" name="Latency" radius={[5, 5, 0, 0]} background={{ fill: theme.grid, fillOpacity: 0.15, radius: 6 }} maxBarSize={34} animationDuration={900} animationEasing="ease-out">
                    {latencyData.map((_, i) => (
                      <Cell key={i} fill={theme.lat} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="card p-4 text-sm text-slate-500 dark:text-slate-400">
            Showing <b className="text-slate-900 dark:text-white">{formatNumber(ov?.total ?? tsData.reduce((a, b) => a + (b.requests || 0), 0))}</b> requests in range <b>{range}</b>.
            {ov?.mostUsed ? <> Most traffic on <code className="font-mono text-brand-600">{typeof ov.mostUsed === 'string' ? ov.mostUsed : ov.mostUsed?.path}</code>.</> : null}
          </div>
        </>
      )}
    </div>
  );
}
