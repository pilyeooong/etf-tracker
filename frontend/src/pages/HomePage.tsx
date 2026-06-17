import { Fragment, useState } from 'react';
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
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 2px', color: '#191f28' }}>ETF 인사이트</h1>
      <p style={{ fontSize: 13, color: '#8b95a1', margin: '0 0 16px' }}>
        {market === 'KR' ? '국내 ETF · 종가 기준 괴리율' : '미국 상장 ETF · 시세·배당'}
      </p>

      {/* KR / US 세그먼트 */}
      <div
        style={{
          display: 'flex',
          background: '#f2f4f6',
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
              fontSize: 14,
              fontWeight: 700,
              background: market === m ? '#fff' : 'transparent',
              color: market === m ? '#191f28' : '#8b95a1',
              boxShadow: market === m ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            {m === 'KR' ? '국내' : '미국'}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        {TABS.map((t) => (
          <button
            key={t.mode}
            onClick={() => setMode(t.mode)}
            style={{
              padding: '8px 16px',
              borderRadius: 999,
              border: 'none',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
              background: mode === t.mode ? '#191f28' : '#f2f4f6',
              color: mode === t.mode ? '#fff' : '#4e5968',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {!isSupabaseConfigured() && (
        <Notice>Supabase 환경변수(VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)를 설정하세요.</Notice>
      )}
      {loading && <p style={{ color: '#8b95a1', padding: '20px 0' }}>불러오는 중…</p>}
      {error && <Notice>오류: {error}</Notice>}
      {data?.map((row, i) => (
        <Fragment key={row.code}>
          <ListRow row={row} />
          {i === 6 && <BannerSlot />}
        </Fragment>
      ))}
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: '#f6f8fa',
        borderRadius: 10,
        padding: '12px 14px',
        fontSize: 13,
        color: '#4e5968',
        lineHeight: 1.6,
        margin: '12px 0',
      }}
    >
      {children}
    </div>
  );
}
