import { useMemo, useState } from 'react';
import { List, Text, TextField } from '@toss/tds-mobile';
import { colors } from '@toss/tds-colors';
import { ListRow } from '@/components/ListRow';
import { useAsync } from '@/hooks/useAsync';
import { searchByHolding, searchByName, searchByTag } from '@/lib/queries';
import type { EtfListRow } from '@/types/etf';

const THEMES = ['반도체', 'AI', '2차전지', '조선', '방산', '원자력', '미국', '배당'];
const TAGS = ['레버리지', '인버스', '커버드콜', '액티브', '배당'];

async function runSearch(query: string, tag: string | null): Promise<EtfListRow[]> {
  if (tag) return searchByTag(tag, 50);
  const q = query.trim();
  if (!q) return [];
  const [byName, byHolding] = await Promise.all([searchByName(q, 40), searchByHolding(q, 40)]);
  const seen = new Set<string>();
  const merged: EtfListRow[] = [];
  for (const r of [...byName, ...byHolding]) {
    if (seen.has(r.code)) continue;
    seen.add(r.code);
    merged.push(r);
  }
  return merged;
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: '16px 0', lineHeight: 1.7 }}>
      <Text typography="t7" color={colors.grey500}>
        {children}
      </Text>
    </div>
  );
}

export function SearchPage() {
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState<string | null>(null);

  const { data, loading, error } = useAsync(() => runSearch(query, tag), [query, tag]);
  const hasResult = useMemo(() => (data?.length ?? 0) > 0, [data]);

  return (
    <div style={{ padding: '20px 16px 88px', maxWidth: 560, margin: '0 auto' }}>
      <div style={{ marginBottom: 12 }}>
        <Text typography="t4" fontWeight="bold" color={colors.grey900}>
          ETF 찾기
        </Text>
      </div>

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

      <Chips
        label="테마"
        items={THEMES}
        active={null}
        onPick={(t) => {
          setTag(null);
          setInput(t);
          setQuery(t);
        }}
      />
      <Chips
        label="유형"
        items={TAGS}
        active={tag}
        onPick={(t) => {
          setInput('');
          setQuery('');
          setTag((cur) => (cur === t ? null : t));
        }}
      />

      <div style={{ marginTop: 8 }}>
        {loading && <Hint>검색 중…</Hint>}
        {error && (
          <div style={{ padding: '16px 0' }}>
            <Text typography="t7" color={colors.red500}>
              오류: {error}
            </Text>
          </div>
        )}
        {!loading && !error && !hasResult && (query || tag) && <Hint>결과가 없습니다.</Hint>}
        {!loading && !error && !query && !tag && (
          <Hint>
            키워드·종목명으로 검색하거나, 위 칩으로 빠르게 찾아보세요. 종목명(예: 삼성전자)으로 검색하면
            그 종목을 담은 ETF를 찾아줍니다.
          </Hint>
        )}
        <List>{data?.map((row) => <ListRow key={row.code} row={row} />)}</List>
      </div>
    </div>
  );
}

function Chips({
  label,
  items,
  active,
  onPick,
}: {
  label: string;
  items: string[];
  active: string | null;
  onPick: (t: string) => void;
}) {
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ marginBottom: 6 }}>
        <Text typography="st12" color={colors.grey500}>
          {label}
        </Text>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {items.map((t) => {
          const on = active === t;
          return (
            <button
              key={t}
              onClick={() => onPick(t)}
              style={{
                padding: '7px 14px',
                borderRadius: 999,
                border: 'none',
                cursor: 'pointer',
                background: on ? colors.blue500 : colors.grey100,
              }}
            >
              <Text typography="st12" fontWeight="bold" color={on ? colors.white : colors.grey700}>
                {t}
              </Text>
            </button>
          );
        })}
      </div>
    </div>
  );
}
