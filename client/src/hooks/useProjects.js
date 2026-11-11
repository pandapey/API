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

/**
 * Shared request cache: many pages/hooks request the same project list at once
 * (Endpoints, Keys, Webhooks, Docs, Logs, Analytics, embedded in ProjectDetail).
 * Identical in-flight requests share one network call; results are cached
 * briefly so mounting several views doesn't fan out 4-6 duplicate GETs.
 */
const cache = new Map(); // key -> { at, result }
const inflight = new Map(); // key -> Promise
const TTL = 10_000;

async function cachedList(params) {
  const key = JSON.stringify(params);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.result;
  if (inflight.has(key)) return inflight.get(key);
  const p = projectService
    .list(params)
    .then((res) => {
      cache.set(key, { at: Date.now(), result: res });
      inflight.delete(key);
      return res;
    })
    .catch((e) => {
      inflight.delete(key);
      throw e;
    });
  inflight.set(key, p);
  return p;
}

/** Invalidate the shared cache (call after create/update/delete). */
export function invalidateProjectsCache() {
  cache.clear();
  inflight.clear();
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
      const res = await cachedList(parsed);
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
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError('');
      try {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        const parsed = JSON.parse(key);
        const res = await cachedList(parsed);
        if (cancelled) return; // stale (deps changed/unmounted) — discard
        setProjects(normalizeList(res));
        setMeta(res?.meta ?? res?.pagination ?? null);
      } catch (e) {
        if (cancelled) return;
        console.error('[useProjects list failed]', e?.response?.data || e.message);
        setError(extractError(e, 'Failed to load projects'));
        setProjects([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [key]);

  return { projects, meta, loading, error, refetch: fetchAll };
}

export default useProjects;
