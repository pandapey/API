import { useCallback, useEffect, useState } from 'react';
import { analyticsService } from '../services/analyticsService.js';

function toArray(v) {
  if (Array.isArray(v)) return v;
  if (Array.isArray(v?.items)) return v.items;
  if (Array.isArray(v?.data)) return v.data;
  return [];
}

// Monotonic run id — only the newest fetch run may setState. Incremented on
// every new run and on unmount, which cancels stale in-flight responses.
let analyticsRunSeq = 0;

/**
 * Normalized analytics data for charts.
 * Server shapes (mapped server-side):
 *  overview.byDay      -> [{ date, count, errors, avgLatencyMs }]
 *  overview.byEndpoint -> [{ endpoint, count, avgLatencyMs }]
 *  overview.byStatus   -> [{ status, count }]
 *  /endpoints          -> [{ endpoint, method, count, avgLatencyMs, errors }]
 *  /status             -> [{ status, count }]
 *  /latency            -> { avgLatencyMs, p95LatencyMs, byDay: [{ date, avgLatencyMs, count }] }
 */
export function useAnalytics({ range = '7d', projectId, from, to } = {}) {
  const [data, setData] = useState({ overview: null, timeseries: [], endpoints: [], status: [], latency: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAll = useCallback(async () => {
    const runId = ++analyticsRunSeq;
    const isStale = () => runId !== analyticsRunSeq;

    setLoading(true);
    setError('');
    const params = { range, projectId, from, to };
    // Prune both undefined AND empty strings so filters stay clean on the wire.
    Object.keys(params).forEach((k) => (params[k] === undefined || params[k] === '') && delete params[k]);
    const totalRequests = 5;
    const failures = [];
    const guard = (promise, label, fallback) =>
      promise.catch((e) => {
        if (isStale()) return fallback;
        console.error(`[analytics ${label} failed]`, e?.response?.data || e.message);
        failures.push(label);
        return fallback;
      });
    try {
      const [overview, timeseries, endpoints, status, latency] = await Promise.all([
        guard(analyticsService.overview(params), 'overview', null),
        guard(analyticsService.timeseries(params), 'timeseries', []),
        guard(analyticsService.byEndpoint(params), 'byEndpoint', []),
        guard(analyticsService.byStatus(params), 'byStatus', []),
        guard(analyticsService.latency(params), 'latency', null),
      ]);
      if (isStale()) return;

      if (failures.length === totalRequests) {
        setError('Failed to load analytics. Please retry.');
        setData({ overview: null, timeseries: [], endpoints: [], status: [], latency: [] });
        return;
      }
      if (failures.length > 0) {
        setError(`Some charts failed to load (${failures.join(', ')}). Showing available data.`);
      }

      let ov = overview ?? null;

      // --- timeseries: per-day { date, requests, success, failed, latency } ---
      let ts = toArray(timeseries).map((d) => ({
        date: d.date || d._id || '',
        requests: d.count ?? d.requests ?? 0,
        success: (d.count ?? d.requests ?? 0) - (d.errors ?? 0),
        failed: d.errors ?? 0,
        latency: d.avgLatencyMs ?? d.avgLatency ?? 0,
      }));
      if (!ts.length && Array.isArray(ov?.byDay) && ov.byDay.length) {
        ts = ov.byDay.map((d) => ({
          date: d.date,
          requests: d.count ?? 0,
          success: (d.count ?? 0) - (d.errors ?? 0),
          failed: d.errors ?? 0,
          latency: d.avgLatencyMs ?? 0,
        }));
      }

      // --- endpoints: { path, method, requests, avgLatencyMs, errors } ---
      let ep = toArray(endpoints).map((e) => ({
        path: e.endpoint ?? e.path ?? '',
        endpoint: e.endpoint ?? e.path ?? '',
        method: e.method || '',
        requests: e.count ?? 0,
        count: e.count ?? 0,
        avgLatencyMs: e.avgLatencyMs ?? 0,
        errors: e.errors ?? 0,
      }));
      if (!ep.length && Array.isArray(ov?.byEndpoint) && ov.byEndpoint.length) {
        ep = ov.byEndpoint.map((e) => ({
          path: e.endpoint,
          endpoint: e.endpoint,
          requests: e.count ?? 0,
          count: e.count ?? 0,
          avgLatencyMs: e.avgLatencyMs ?? 0,
          errors: 0,
        }));
      }

      // --- status: { name, status, value } ---
      let st = toArray(status).map((s) => ({
        name: String(s.status ?? s._id ?? s.name ?? ''),
        status: String(s.status ?? s._id ?? s.name ?? ''),
        value: s.count ?? s.value ?? 0,
        count: s.count ?? s.value ?? 0,
      }));
      if (!st.length && Array.isArray(ov?.byStatus) && ov.byStatus.length) {
        st = ov.byStatus.map((s) => ({ name: String(s.status), status: String(s.status), value: s.count ?? 0, count: s.count ?? 0 }));
      }

      // --- latency: flat per-day rows { date, latency, p95 } ---
      const latencyObj = Array.isArray(latency) ? latency[0] : latency;
      const byDay = latencyObj?.byDay || [];
      let lat = byDay.map((d) => ({
        date: d.date,
        latency: d.avgLatencyMs ?? d.latency ?? 0,
        p95: latencyObj?.p95LatencyMs ?? 0,
      }));
      if (!lat.length && ov && (ov.avgLatencyMs != null || ov.p95LatencyMs != null)) {
        // No per-day data in range — show the range aggregates as one row.
        lat = [{ date: '', latency: ov.avgLatencyMs ?? 0, p95: ov.p95LatencyMs ?? 0 }];
      }

      // Enrich overview for Dashboard cards (success/failed/mostUsed/latency)
      if (ov && ov.total != null) {
        const total = ov.total || 0;
        const failed = ov.errors ?? 0;
        const topEp = (Array.isArray(ov.byEndpoint) && ov.byEndpoint[0]) || ep[0] || null;
        ov = {
          ...ov,
          success: total - failed,
          failed,
          avgLatency: ov.avgLatencyMs ?? 0,
          mostUsed: ov.mostUsed ?? (topEp ? topEp.endpoint || topEp.path : null),
        };
      }

      if (isStale()) return;
      setData({ overview: ov, timeseries: ts, endpoints: ep, status: st, latency: lat });
    } catch (e) {
      if (isStale()) return;
      setError(e?.response?.data?.message || e.message || 'Failed to load analytics');
      if (!isStale()) setLoading(false);
      return;
    }
    if (!isStale()) setLoading(false);
  }, [range, projectId, from, to]);

  useEffect(() => {
    fetchAll();
    return () => {
      // Cancel any in-flight run when unmounting or when deps change.
      analyticsRunSeq++;
    };
  }, [fetchAll]);

  return { ...data, loading, error, refetch: fetchAll };
}

export default useAnalytics;
