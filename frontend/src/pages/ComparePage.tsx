import { useCallback, useMemo, useState } from 'react';
import { List, ListRow as TdsListRow, Text, TextField } from '@toss/tds-mobile';
import { colors } from '@toss/tds-colors';
import { AdGate } from '@/components/AdGate';
import { LoadMore } from '@/components/LoadMore';
import { FilterChips } from '@/components/FilterChips';
import { MarketToggle } from '@/components/MarketToggle';
import { useAsync } from '@/hooks/useAsync';
import { useInfiniteList } from '@/hooks/useInfiniteList';
import { fetchCompareData, fetchTopList, searchEtfs } from '@/lib/queries';
import { marketCap, pct, price, signColor } from '@/lib/format';
import type { DetailBundle } from '@/lib/queries';
import type { EtfListRow, Market } from '@/types/etf';

const MAX = 3;
const PAGE = 30;

// 추가 가능한 ETF 한 줄 (검색·둘러보기 공용)
function PickRow({ row, onAdd }: { row: EtfListRow; onAdd: () => void }) {
  return (
    <TdsListRow
      withTouchEffect
      horizontalPadding="small"
      onClick={onAdd}
      contents={
        <div>
          <Text typography="t6" fontWeight="bold" color={colors.grey900}>
            {row.etf_meta?.name ?? row.code}
          </Text>
          <div style={{ marginTop: 2 }}>
            <Text typography="st12" color={colors.grey500}>
              {row.code} · {row.etf_meta?.category ?? '-'}
            </Text>
          </div>
        </div>
      }
    />
  );
}

interface Picked {
  code: string;
  name: string;
}

function returnOf(b: DetailBundle, period: string): number | null {
  const r = (b.detail?.returns ?? []).find((x) => x.period === period);
  return r?.value ?? null;
}

interface Metric {
  label: string;
  value: (b: DetailBundle) => string;
  color?: (b: DetailBundle) => string;
}

const METRICS: Metric[] = [
  {
    label: '현재가',
    value: (b) => price(b.quote?.close, b.meta?.currency ?? 'KRW'),
  },
  {
    label: '등락률',
    value: (b) => pct(b.quote?.change_pct),
    color: (b) => signColor(b.quote?.change_pct),
  },
  {
    label: '괴리율',
    value: (b) => (b.meta?.market === 'US' ? '-' : pct(b.quote?.premium_pct)),
    color: (b) => (b.meta?.market === 'US' ? colors.grey900 : signColor(b.quote?.premium_pct)),
  },
  { label: '총보수', value: (b) => (b.meta?.fee_pct != null ? `${b.meta.fee_pct}%` : '-') },
  {
    label: '분배수익률',
    value: (b) => (b.detail?.dividend_yield != null ? `${b.detail.dividend_yield}%` : '-'),
  },
  {
    label: '3개월',
    value: (b) => pct(returnOf(b, 'M3')),
    color: (b) => signColor(returnOf(b, 'M3')),
  },
  {
    label: '1년',
    value: (b) => pct(returnOf(b, 'Y1')),
    color: (b) => signColor(returnOf(b, 'Y1')),
  },
  { label: '시가총액', value: (b) => marketCap(b.quote?.market_cap, b.meta?.currency ?? 'KRW') },
];

export function ComparePage() {
  const [picked, setPicked] = useState<Picked[]>([]);
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  const codes = picked.map((p) => p.code);
  const codesKey = codes.join(',');
  const isSearching = Boolean(query.trim() || tag);

  const [browseMarket, setBrowseMarket] = useState<Market>('KR');
  const browseFetch = useCallback(
    (offset: number) => fetchTopList('volume', browseMarket, PAGE, offset),
    [browseMarket],
  );
  const browse = useInfiniteList(browseFetch, [browseMarket], PAGE);

  const search = useAsync(() => searchEtfs(query, tag), [query, tag]);
  const compare = useAsync(
    () => (revealed && codes.length >= 2 ? fetchCompareData(codes) : Promise.resolve([])),
    [revealed, codesKey],
  );

  const add = (code: string, name: string) => {
    if (picked.length >= MAX || picked.some((p) => p.code === code)) return;
    setPicked((cur) => [...cur, { code, name }]);
    setRevealed(false);
    setInput('');
    setQuery('');
    setTag(null);
  };
  const remove = (code: string) => {
    setPicked((cur) => cur.filter((p) => p.code !== code));
    setRevealed(false);
  };

  return (
    <div style={{ padding: '20px 16px 88px', maxWidth: 560, margin: '0 auto' }}>
      <div>
        <Text typography="t3" fontWeight="bold" color={colors.grey900}>
          ETF 비교
        </Text>
      </div>
      <div style={{ margin: '2px 0 14px' }}>
        <Text typography="t7" color={colors.grey500}>
          최대 {MAX}개까지 골라 한눈에 비교하고 구성종목 겹침까지 확인해요.
        </Text>
      </div>

      {/* 선택된 ETF 칩 */}
      {picked.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          {picked.map((p) => (
            <button
              key={p.code}
              onClick={() => remove(p.code)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 12px',
                borderRadius: 999,
                border: 'none',
                cursor: 'pointer',
                background: colors.blue50,
                maxWidth: '100%',
              }}
            >
              <Text typography="st12" fontWeight="bold" color={colors.blue600}>
                {p.name}
              </Text>
              <Text typography="st12" color={colors.blue500}>
                ✕
              </Text>
            </button>
          ))}
        </div>
      )}

      {/* 검색 + 둘러보기로 추가 (결과 노출 전, 3개 미만일 때) */}
      {!revealed && picked.length < MAX && (
        <>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setQuery(input);
            }}
          >
            <TextField
              variant="box"
              placeholder="비교할 ETF 검색 (예: KODEX 200)"
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

          {isSearching ? (
            // 검색 결과
            <div style={{ marginTop: 6 }}>
              <List>
                {(search.data ?? [])
                  .filter((r) => !codes.includes(r.code))
                  .map((r) => (
                    <PickRow key={r.code} row={r} onAdd={() => add(r.code, r.etf_meta?.name ?? r.code)} />
                  ))}
              </List>
              {!search.loading && (search.data?.length ?? 0) === 0 && (
                <div style={{ padding: '16px 0' }}>
                  <Text typography="st12" color={colors.grey400}>
                    결과가 없어요.
                  </Text>
                </div>
              )}
            </div>
          ) : (
            // 둘러보기 (거래량순, 페이지네이션)
            <>
              <MarketToggle market={browseMarket} onChange={setBrowseMarket} style={{ margin: '16px 0 8px' }} />
              <List>
                {browse.items
                  .filter((r) => !codes.includes(r.code))
                  .map((r) => (
                    <PickRow key={r.code} row={r} onAdd={() => add(r.code, r.etf_meta?.name ?? r.code)} />
                  ))}
              </List>
              <LoadMore onVisible={browse.loadMore} hasMore={browse.hasMore} loading={browse.loadingMore} />
            </>
          )}
        </>
      )}

      {/* 비교 실행 (리워드 게이트) */}
      {codes.length >= 2 && !revealed && (
        <div style={{ marginTop: 20 }}>
          <AdGate cta="광고 보고 비교 결과 보기" onRewardGranted={() => setRevealed(true)} />
        </div>
      )}
      {/* 결과 */}
      {revealed && compare.loading && (
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <Text typography="t7" color={colors.grey500}>
            불러오는 중…
          </Text>
        </div>
      )}
      {revealed && compare.data && compare.data.length >= 2 && (
        <>
          <CompareTable bundles={compare.data} />
          <OverlapSection bundles={compare.data} />
        </>
      )}
    </div>
  );
}

function CompareTable({ bundles }: { bundles: DetailBundle[] }) {
  const cols = `92px repeat(${bundles.length}, 1fr)`;
  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ marginBottom: 12 }}>
        <Text typography="t6" fontWeight="bold" color={colors.grey900}>
          비교표
        </Text>
      </div>
      {/* 헤더: ETF 이름 */}
      <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 6, alignItems: 'end', paddingBottom: 8 }}>
        <span />
        {bundles.map((b) => (
          <div key={b.meta?.code} style={{ textAlign: 'right', overflow: 'hidden' }}>
            <Text typography="st13" fontWeight="bold" color={colors.grey900}>
              {b.meta?.name ?? b.meta?.code}
            </Text>
          </div>
        ))}
      </div>
      {METRICS.map((m) => (
        <div
          key={m.label}
          style={{
            display: 'grid',
            gridTemplateColumns: cols,
            gap: 6,
            padding: '10px 0',
            borderTop: `1px solid ${colors.grey100}`,
            alignItems: 'center',
          }}
        >
          <Text typography="st12" color={colors.grey500}>
            {m.label}
          </Text>
          {bundles.map((b) => (
            <div key={b.meta?.code} style={{ textAlign: 'right' }}>
              <Text typography="st12" fontWeight="bold" color={m.color ? m.color(b) : colors.grey900}>
                {m.value(b)}
              </Text>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function holdingNames(b: DetailBundle): string[] {
  return b.holdings.map((h) => h.stock_name).filter(Boolean);
}

function OverlapSection({ bundles }: { bundles: DetailBundle[] }) {
  const { shared, pairs, hasData } = useMemo(() => {
    const sets = bundles.map((b) => new Set(holdingNames(b)));
    const counts = new Map<string, number>();
    sets.forEach((s) => s.forEach((n) => counts.set(n, (counts.get(n) ?? 0) + 1)));
    const shared = [...counts.entries()]
      .filter(([, c]) => c >= 2)
      .sort((a, b) => b[1] - a[1]);
    const pairs: { a: string; b: string; n: number }[] = [];
    for (let i = 0; i < bundles.length; i++) {
      for (let j = i + 1; j < bundles.length; j++) {
        const n = [...sets[i]].filter((x) => sets[j].has(x)).length;
        pairs.push({
          a: bundles[i].meta?.name ?? '',
          b: bundles[j].meta?.name ?? '',
          n,
        });
      }
    }
    const hasData = sets.some((s) => s.size > 0);
    return { shared, pairs, hasData };
  }, [bundles]);

  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ marginBottom: 4 }}>
        <Text typography="t6" fontWeight="bold" color={colors.grey900}>
          구성종목 겹침
        </Text>
      </div>
      <div style={{ marginBottom: 12 }}>
        <Text typography="st12" color={colors.grey500}>
          주요 구성종목(TOP10) 기준 · 중복 투자 점검에 참고하세요.
        </Text>
      </div>

      {!hasData ? (
        <Text typography="st12" color={colors.grey400}>
          구성종목 데이터가 없는 종목이에요.
        </Text>
      ) : (
        <>
          {/* 쌍별 겹침 수 */}
          {pairs.map((p) => (
            <div
              key={`${p.a}-${p.b}`}
              style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0' }}
            >
              <Text typography="st12" color={colors.grey700}>
                {p.a} ∩ {p.b}
              </Text>
              <Text typography="st12" fontWeight="bold" color={p.n > 0 ? colors.blue500 : colors.grey400}>
                {p.n}종목 겹침
              </Text>
            </div>
          ))}

          {/* 공통 보유 종목 */}
          {shared.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ marginBottom: 8 }}>
                <Text typography="st12" fontWeight="bold" color={colors.grey700}>
                  공통 보유 {shared.length}종목
                </Text>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {shared.map(([name, count]) => (
                  <div
                    key={name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '6px 10px',
                      borderRadius: 999,
                      background: colors.grey50,
                    }}
                  >
                    <Text typography="st12" color={colors.grey900}>
                      {name}
                    </Text>
                    {bundles.length === 3 && (
                      <Text typography="st13" fontWeight="bold" color={colors.blue500}>
                        {count}
                      </Text>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
