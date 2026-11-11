import { useCallback, useEffect, useState } from 'react';
import { logService } from '../services/logService.js';
import { extractError } from '../services/api.js';

function normalize(v) {
  if (Array.isArray(v)) return { items: v, meta: null };
  return { items: v?.items || v?.logs || v?.data || [], meta: v?.meta || v?.pagination || null };
}

export function useLogs(initial = {}) {
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    status: '',
    endpoint: '',
    projectId: '',
    from: '',
    to: '',
    ...initial,
  });
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchLogs = useCallback(async (override = {}) => {
    const f = { ...filters, ...override };
    Object.keys(f).forEach((k) => (f[k] === '' || f[k] === undefined) && delete f[k]);
    setLoading(true);
    setError('');
    try {
      const res = await logService.list(f);
      const n = normalize(res);
      setItems(n.items);
      setMeta(n.meta);
    } catch (e) {
      if (e?.code === 'ERR_CANCELED' || e?.name === 'CanceledError') return;
      console.error('[useLogs failed]', e?.response?.data || e.message);
      setError(extractError(e, 'Failed to load logs'));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Debounce free-text endpoint filter (300ms) to avoid request storm + races.
  const [debouncedEndpoint, setDebouncedEndpoint] = useState(filters.endpoint);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedEndpoint(filters.endpoint), 300);
    return () => clearTimeout(t);
  }, [filters.endpoint]);

  useEffect(() => {
    fetchLogs({ endpoint: debouncedEndpoint });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.page, filters.limit, filters.projectId, filters.status, debouncedEndpoint, filters.from, filters.to]);

  return { logs: items, meta, loading, error, filters, setFilters, refetch: fetchLogs };
}
