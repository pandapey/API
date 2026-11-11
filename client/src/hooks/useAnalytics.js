import { useCallback, useEffect, useState } from 'react';
import { analyticsService } from '../services/analyticsService.js';

function toArray(v) {
  if (Array.isArray(v)) return v;
  if (Array.isArray(v?.items)) return v.items;
  if (Array.isArray(v?.data)) return v.data;
  return [];
}

export function useAnalytics({ range = '7d', projectId, from, to } = {}) {
  const [data, setData] = useState({ overview: null, timeseries: [], endpoints: [], status: [], latency: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    const params = { range, projectId, from, to };
    Object.keys(params).forEach((k) => params[k] === undefined && delete params[k]);
    if (!params.projectId) delete params.projectId;
    const failures = [];
    const guard = (promise, label, fallback) =>
      promise.catch((e) => {
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
        guard(analyticsService.latency(params), 'latency', []),
      ]);
      // Surface partial failures so ErrorState can show with retry (Dashboard checks error)
      if (failures.length === 5) {
        setError('Failed to load analytics. Please retry.');
        setData({ overview: null, timeseries: [], endpoints: [], status: [], latency: [] });
        return;
      }
      if (failures.length > 0) {
        setError(`Some charts failed to load (${failures.join(', ')}). Showing available data.`);
      }
      let ts = toArray(timeseries);
      let ep = toArray(endpoints);
      let st = toArray(status);
      let lat = toArray(latency);
      // Fall back to overview.byDay / byEndpoint / byStatus (server shape)
      if (!ts.length && Array.isArray(overview?.byDay)) {
        ts = overview.byDay.map((d) => ({ date: d.date, requests: d.count, success: (d.count || 0) - (d.errors || 0), failed: d.errors || 0, latency: d.avgLatencyMs ?? d.avgLatency ?? 0 }));
      }
      if (!ep.length && Array.isArray(overview?.byEndpoint)) {
        ep = overview.byEndpoint.map((e) => ({ path: e.endpoint, endpoint: e.endpoint, requests: e.count, count: e.count }));
      }
      if (!st.length && Array.isArray(overview?.byStatus)) {
        st = overview.byStatus.map((s) => ({ name: String(s.status), status: String(s.status), value: s.count, count: s.count }));
      }
      if (!lat.length && overview && (overview.avgLatencyMs != null || overview.p95LatencyMs != null)) {
        lat = [{ avgLatency: overview.avgLatencyMs, p95: overview.p95LatencyMs }];
      }
      // Enrich overview for Dashboard cards (total/success/failed/today/month/mostUsed)
      let ov = overview ?? null;
      if (ov && ov.total != null && ov.success == null) {
        const total = ov.total || 0;
        const failed = ov.errors ?? ov.failed ?? 0;
        const topEp = (Array.isArray(ov.byEndpoint) && ov.byEndpoint[0]) || ep[0] || null;
        const mostUsed = ov.mostUsed ?? ov.topEndpoint ?? (topEp ? (topEp.endpoint || topEp.path || topEp.name) : null);
        ov = {
          ...ov,
          success: total - failed,
          failed,
          avgLatency: ov.avgLatency ?? ov.avgLatencyMs ?? 0,
          today: ov.today ?? total,
          month: ov.month ?? total,
          mostUsed: mostUsed || null,
        };
      } else if (ov && !ov.mostUsed && !ov.topEndpoint) {
        const topEp = (Array.isArray(ov.byEndpoint) && ov.byEndpoint[0]) || ep[0] || null;
        if (topEp) ov = { ...ov, mostUsed: topEp.endpoint || topEp.path || topEp.name };
      }
      setData({
        overview: ov,
        timeseries: ts,
        endpoints: ep,
        status: st,
        latency: lat,
      });
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [range, projectId, from, to]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { ...data, loading, error, refetch: fetchAll };
}
