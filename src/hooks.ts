import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { api } from './api';

// Load `path` whenever the screen gains focus; supports pull-to-refresh.
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const pathRef = useRef(path);
  pathRef.current = path;

  const seq = useRef(0);

  const load = useCallback(async (pull = false) => {
    if (!pathRef.current) return;
    const mine = ++seq.current;
    if (pull) setRefreshing(true);
    try {
      const res = await api.get<T>(pathRef.current);
      // Ignore responses for an older path (e.g. a previous search term).
      if (mine !== seq.current) return;
      setData(res);
      setError('');
    } catch (e) {
      if (mine === seq.current) setError((e as Error).message);
    } finally {
      if (mine === seq.current) setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load, path])
  );

  return { data, error, refreshing, reload: load, refresh: () => load(true), setData };
}

// Offset-paginated list with infinite scroll. `path` may already contain a query string.
export function usePaged<T extends { id: string }>(path: string, pageSize = 20) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState('');
  const gen = useRef(0);
  const itemsRef = useRef<T[]>([]);
  itemsRef.current = items;
  const busy = useRef(false);

  const url = (offset: number) => `${path}${path.includes('?') ? '&' : '?'}limit=${pageSize}&offset=${offset}`;

  const loadFirst = useCallback(
    async (pull = false) => {
      const g = ++gen.current;
      if (pull) setRefreshing(true);
      try {
        const rows = await api.get<T[]>(url(0));
        if (g !== gen.current) return;
        setItems(rows);
        setHasMore(rows.length === pageSize);
        setError('');
      } catch (e) {
        if (g === gen.current) setError((e as Error).message);
      } finally {
        if (g === gen.current) {
          setLoading(false);
          setRefreshing(false);
          busy.current = false;
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [path, pageSize]
  );

  const loadMore = useCallback(async () => {
    if (busy.current || !hasMore || loading) return;
    busy.current = true;
    const g = gen.current;
    setLoadingMore(true);
    try {
      const rows = await api.get<T[]>(url(itemsRef.current.length));
      if (g !== gen.current) return;
      setItems((prev) => {
        const seen = new Set(prev.map((r) => r.id));
        return [...prev, ...rows.filter((r) => !seen.has(r.id))];
      });
      setHasMore(rows.length === pageSize);
    } catch (e) {
      if (g === gen.current) setError((e as Error).message);
    } finally {
      if (g === gen.current) busy.current = false;
      setLoadingMore(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loading, path, pageSize]);

  // New filter -> show loader and refetch from the first page.
  useEffect(() => {
    setLoading(true);
    setItems([]);
    setHasMore(true);
  }, [path]);

  useFocusEffect(
    useCallback(() => {
      loadFirst();
    }, [loadFirst])
  );

  return { items, setItems, loading, refreshing, loadingMore, hasMore, error, refresh: () => loadFirst(true), reload: () => loadFirst(), loadMore };
}

// Value that only updates after `ms` without changes (for search boxes).
export function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
