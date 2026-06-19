import { Fragment, useCallback, useState } from 'react';
import { List, Text, TextField } from '@toss/tds-mobile';
import { colors } from '@toss/tds-colors';
import { ListRow } from '@/components/ListRow';
import { BannerSlot } from '@/components/BannerSlot';
import { LoadMore } from '@/components/LoadMore';
import { FilterChips } from '@/components/FilterChips';
import { useAsync } from '@/hooks/useAsync';
import { useInfiniteList } from '@/hooks/useInfiniteList';
import { fetchTopList, searchEtfs, type ListMode } from '@/lib/queries';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { Market } from '@/types/etf';

const TABS: { mode: ListMode; label: string }[] = [
  { mode: 'volume', label: '거래량' },
  { mode: 'gainers', label: '상승' },
  { mode: 'losers', label: '하락' },
];
const PAGE = 30;

export function HomePage() {
  const [market, setMarket] = useState<Market>('KR');
  const [mode, setMode] = useState<ListMode>('volume');
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState<string | null>(null);

  const isSearching = Boolean(query.trim() || tag);

  const result = useAsync(() => searchEtfs(query, tag), [query, tag]);
  const fetchPage = useCallback(
    (offset: number) => fetchTopList(mode, market, PAGE, offset),
    [mode, market],
  );
  const browse = useInfiniteList(fetchPage, [mode, market], PAGE);

  return (
    <div style={{ padding: '20px 16px 88px', maxWidth: 560, margin: '0 auto' }}>
      <div>
        <Text typography="t3" fontWeight="bold" color={colors.grey900}>
          ETF 인사이트
        </Text>
      </div>
      <div style={{ margin: '2px 0 14px' }}>
        <Text typography="t7" color={colors.grey500}>
          국내·미국 ETF 시세·괴리율·구성종목을 한눈에
        </Text>
      </div>

      {/* 검색 */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setTag(null);
          setQuery(input);
        }}
      >
        <TextField
          variant="box"
          placeholder="ETF 이름 또는 종목명 (예: 삼성전자, 반도체)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
      </form>

      {/* 카테고리 칩 (공유 컴포넌트) */}
      <FilterChips
        activeTag={tag}
        onPickTheme={(t) => {
          setTag(null);
          setInput(t);
          setQuery(t);
        }}
        onPickTag={(t) => {
          setInput('');
          setQuery('');
          setTag((cur) => (cur === t ? null : t));
        }}
      />

      {!isSupabaseConfigured() && (
        <Notice>Supabase 환경변수(VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)를 설정하세요.</Notice>
      )}

      {isSearching ? (
        // 검색/칩 결과
        <div style={{ marginTop: 12 }}>
          {result.loading && <Hint>검색 중…</Hint>}
          {result.error && <Hint color={colors.red500}>오류: {result.error}</Hint>}
          {!result.loading && !result.error && (result.data?.length ?? 0) === 0 && (
            <Hint>결과가 없어요.</Hint>
          )}
          <List>{result.data?.map((row) => <ListRow key={row.code} row={row} />)}</List>
        </div>
      ) : (
        // 기본: 국내/미국 + 거래량/상승/하락 둘러보기 (페이지네이션)
        <>
          <div
            style={{
              display: 'flex',
              background: colors.grey100,
              borderRadius: 10,
              padding: 3,
              margin: '16px 0 12px',
            }}
          >
            {(['KR', 'US'] as Market[]).map((m) => (
              <button
                key={m}
                onClick={() => setMarket(m)}
                style={{
                  flex: 1,
                  padding: '9px 0',
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  background: market === m ? colors.white : 'transparent',
                  boxShadow: market === m ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                <Text typography="t7" fontWeight="bold" color={market === m ? colors.grey900 : colors.grey500}>
                  {m === 'KR' ? '국내' : '미국'}
                </Text>
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
            {TABS.map((t) => {
              const on = mode === t.mode;
              return (
                <button
                  key={t.mode}
                  onClick={() => setMode(t.mode)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 999,
                    border: 'none',
                    cursor: 'pointer',
                    background: on ? colors.grey900 : colors.grey100,
                  }}
                >
                  <Text typography="t7" fontWeight="bold" color={on ? colors.white : colors.grey700}>
                    {t.label}
                  </Text>
                </button>
              );
            })}
          </div>

          {browse.error && <Hint color={colors.red500}>오류: {browse.error}</Hint>}
          <List>
            {browse.items.map((row, i) => (
              <Fragment key={row.code}>
                <ListRow row={row} />
                {i === 6 && <BannerSlot />}
              </Fragment>
            ))}
          </List>
          <LoadMore onVisible={browse.loadMore} hasMore={browse.hasMore} loading={browse.loadingMore} />
        </>
      )}
    </div>
  );
}

function Hint({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <div style={{ padding: '16px 0', lineHeight: 1.7 }}>
      <Text typography="t7" color={color ?? colors.grey500}>
        {children}
      </Text>
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: colors.grey50, borderRadius: 10, padding: '12px 14px', lineHeight: 1.6, margin: '12px 0' }}>
      <Text typography="t7" color={colors.grey700}>
        {children}
      </Text>
    </div>
  );
}
