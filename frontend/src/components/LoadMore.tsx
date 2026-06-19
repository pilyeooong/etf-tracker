import { useEffect, useRef } from 'react';
import { Text } from '@toss/tds-mobile';
import { colors } from '@toss/tds-colors';

// 화면 하단에 닿으면 onVisible 호출(무한 스크롤). hasMore일 때만 관찰.
export function LoadMore({
  onVisible,
  hasMore,
  loading,
}: {
  onVisible: () => void;
  hasMore: boolean;
  loading: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const cbRef = useRef(onVisible);
  cbRef.current = onVisible;

  useEffect(() => {
    if (!hasMore || !ref.current) return;
    const el = ref.current;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) cbRef.current();
      },
      { rootMargin: '300px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore]);

  if (!hasMore && !loading) return null;
  return (
    <div ref={ref} style={{ padding: '16px 0', textAlign: 'center' }}>
      {loading && (
        <Text typography="st12" color={colors.grey400}>
          더 불러오는 중…
        </Text>
      )}
    </div>
  );
}
