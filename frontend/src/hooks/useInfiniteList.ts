import { useCallback, useEffect, useRef, useState } from 'react';

interface State<T> {
  items: T[];
  loading: boolean; // 첫 페이지 로딩
  loadingMore: boolean; // 추가 페이지 로딩
  hasMore: boolean;
  error: string | null;
  loadMore: () => void;
}

// offset 기반 페이지네이션 누적 로더. deps 변경 시 처음부터 다시 로드.
export function useInfiniteList<T>(
  fetchPage: (offset: number) => Promise<T[]>,
  deps: unknown[],
  pageSize = 30,
): State<T> {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const offsetRef = useRef(0);
  const busyRef = useRef(false);
  const fetchRef = useRef(fetchPage);
  fetchRef.current = fetchPage;

  // deps 변경 → 리셋 후 첫 페이지
  useEffect(() => {
    let alive = true;
    offsetRef.current = 0;
    busyRef.current = true;
    setItems([]);
    setHasMore(true);
    setError(null);
    setLoading(true);

    fetchRef
      .current(0)
      .then((rows) => {
        if (!alive) return;
        setItems(rows);
        offsetRef.current = rows.length;
        setHasMore(rows.length >= pageSize);
        setLoading(false);
        busyRef.current = false;
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : String(e));
        setLoading(false);
        busyRef.current = false;
      });

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const loadMore = useCallback(() => {
    if (busyRef.current || !hasMore) return;
    busyRef.current = true;
    setLoadingMore(true);
    fetchRef
      .current(offsetRef.current)
      .then((rows) => {
        setItems((prev) => [...prev, ...rows]);
        offsetRef.current += rows.length;
        setHasMore(rows.length >= pageSize);
        setLoadingMore(false);
        busyRef.current = false;
      })
      .catch(() => {
        setLoadingMore(false);
        busyRef.current = false;
      });
  }, [hasMore, pageSize]);

  return { items, loading, loadingMore, hasMore, error, loadMore };
}
