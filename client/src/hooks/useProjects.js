import { useCallback, useEffect, useState } from 'react';
import { projectService } from '../services/projectService.js';
import { extractError } from '../services/api.js';

function normalizeList(v) {
  if (Array.isArray(v)) return v;
  if (Array.isArray(v?.items)) return v.items;
  if (Array.isArray(v?.projects)) return v.projects;
  if (Array.isArray(v?.data)) return v.data;
  return [];
}

export function useProjects(params = {}) {
  const key = JSON.stringify(params);
  const [projects, setProjects] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const parsed = JSON.parse(key);
      const res = await projectService.list(parsed);
      setProjects(normalizeList(res));
      setMeta(res?.meta ?? res?.pagination ?? null);
    } catch (e) {
      console.error('[useProjects list failed]', e?.response?.data || e.message);
      setError(extractError(e, 'Failed to load projects'));
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [key]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { projects, meta, loading, error, refetch: fetchAll };
}
