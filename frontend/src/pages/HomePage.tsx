import { Fragment, useState } from 'react';
import { List, Text } from '@toss/tds-mobile';
import { colors } from '@toss/tds-colors';
import { ListRow } from '@/components/ListRow';
import { BannerSlot } from '@/components/BannerSlot';
import { useAsync } from '@/hooks/useAsync';
import { fetchTopList, type ListMode } from '@/lib/queries';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { Market } from '@/types/etf';

const TABS: { mode: ListMode; label: string }[] = [
  { mode: 'volume', label: '거래량' },
  { mode: 'gainers', label: '상승' },
  { mode: 'losers', label: '하락' },
];

export function HomePage() {
  const [market, setMarket] = useState<Market>('KR');
  const [mode, setMode] = useState<ListMode>('volume');
  const { data, loading, error } = useAsync(() => fetchTopList(mode, market, 30), [mode, market]);

  return (
    <div style={{ padding: '20px 16px 88px', maxWidth: 560, margin: '0 auto' }}>
      <div>
        <Text typography="t3" fontWeight="bold" color={colors.grey900}>
          ETF 인사이트
        </Text>
      </div>
      <div style={{ margin: '2px 0 16px' }}>
        <Text typography="t7" color={colors.grey500}>
          {market === 'KR' ? '국내 ETF · 종가 기준 괴리율' : '미국 상장 ETF · 시세·배당'}
        </Text>
      </div>

      {/* KR / US 세그먼트 */}
      <div
        style={{
          display: 'flex',
          background: colors.grey100,
          borderRadius: 10,
          padding: 3,
          marginBottom: 12,
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

      {/* 거래량/상승/하락 탭 */}
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

      {!isSupabaseConfigured() && (
        <Notice>Supabase 환경변수(VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)를 설정하세요.</Notice>
      )}
      {loading && (
        <Text typography="t7" color={colors.grey500} style={{ display: 'block', padding: '20px 0' }}>
          불러오는 중…
        </Text>
      )}
      {error && <Notice>오류: {error}</Notice>}

      <List>
        {data?.map((row, i) => (
          <Fragment key={row.code}>
            <ListRow row={row} />
            {i === 6 && <BannerSlot />}
          </Fragment>
        ))}
      </List>
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: colors.grey50,
        borderRadius: 10,
        padding: '12px 14px',
        lineHeight: 1.6,
        margin: '12px 0',
      }}
    >
      <Text typography="t7" color={colors.grey700}>
        {children}
      </Text>
    </div>
  );
}
