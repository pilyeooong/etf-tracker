import { Text } from '@toss/tds-mobile';
import { colors } from '@toss/tds-colors';
import type { Market } from '@/types/etf';

// 홈·비교 공유 — 국내/미국 풀폭 세그먼트 토글.
export function MarketToggle({
  market,
  onChange,
  style,
}: {
  market: Market;
  onChange: (m: Market) => void;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        display: 'flex',
        background: colors.grey100,
        borderRadius: 10,
        padding: 3,
        ...style,
      }}
    >
      {(['KR', 'US'] as Market[]).map((m) => {
        const on = market === m;
        return (
          <button
            key={m}
            onClick={() => onChange(m)}
            style={{
              flex: 1,
              padding: '9px 0',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              background: on ? colors.white : 'transparent',
              boxShadow: on ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            <Text typography="t7" fontWeight="bold" color={on ? colors.grey900 : colors.grey500}>
              {m === 'KR' ? '국내' : '미국'}
            </Text>
          </button>
        );
      })}
    </div>
  );
}
