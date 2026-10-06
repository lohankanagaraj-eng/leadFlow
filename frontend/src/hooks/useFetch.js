import { useCallback, useEffect, useRef, useState } from 'react';
import { get } from '@/api/client';

/**
 * Small data-fetching hook with loading/error/refresh + optional polling.
 *   const { data, meta, loading, error, reload } = useFetch('/leads', { params, deps: [status] });
 */
export function useFetch(url, { params = {}, deps = [], enabled = true, poll = 0 } = {}) {
  const [data, setData] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(!!enabled);
  const [error, setError] = useState(null);
  const mounted = useRef(true);
  const paramsKey = JSON.stringify(params);

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const res = await get(url, { ...JSON.parse(paramsKey), ...params });
      if (!mounted.current) return;
      setData(res.data);
      setMeta(res.meta || null);
    } catch (err) {
      if (mounted.current) setError(err);
    } finally {
      if (mounted.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, paramsKey, enabled]);

  useEffect(() => {
    mounted.current = true;
    load();
    return () => { mounted.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, ...deps]);

  useEffect(() => {
    if (!poll) return undefined;
    const t = setInterval(load, poll);
    return () => clearInterval(t);
  }, [poll, load]);

  return { data, meta, loading, error, reload: load, setData };
}

/** Standard paginated table state. */
export function usePagination(initialLimit = 15) {
  const [page, setPage] = useState(1);
  const [limit] = useState(initialLimit);
  const [search, setSearch] = useState('');
  const reset = useCallback(() => setPage(1), []);
  return { page, limit, search, setSearch, setPage, reset };
}
