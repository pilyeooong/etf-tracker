import { useNavigate } from 'react-router-dom';
import { ListRow as TdsListRow, Text } from '@toss/tds-mobile';
import { colors } from '@toss/tds-colors';
import { pct, price, signColor } from '@/lib/format';
import { maybeShowInterstitial } from '@/lib/interstitial';
import type { EtfListRow } from '@/types/etf';

// TDS Text는 인라인이라 style의 display:block을 무시함 → 줄바꿈은 block <div> 래퍼로 강제.
const ellipsis = {
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
} as const;
const nowrap = { whiteSpace: 'nowrap' } as const;

export function ListRow({ row }: { row: EtfListRow }) {
  const navigate = useNavigate();
  const name = row.etf_meta?.name ?? row.code;
  const currency = row.etf_meta?.currency ?? 'KRW';
  const isUS = row.etf_meta?.market === 'US';

  return (
    <TdsListRow
      withTouchEffect
      horizontalPadding="small"
      onClick={() => {
        navigate(`/etf/${row.code}`);
        maybeShowInterstitial(); // 빈도 조건 충족 시에만 전면 광고
      }}
      contents={
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
            gap: 12,
          }}
        >
          {/* 왼쪽: 이름 / 코드·분류 (각각 한 줄, 길면 말줄임) */}
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={ellipsis}>
              <Text typography="t6" fontWeight="bold" color={colors.grey900} style={nowrap}>
                {name}
              </Text>
            </div>
            <div style={{ marginTop: 2, ...ellipsis }}>
              <Text typography="st12" color={colors.grey500} style={nowrap}>
                {row.code} · {row.etf_meta?.category ?? '-'}
              </Text>
            </div>
          </div>
          {/* 오른쪽: 가격 / 변동율·괴리율 (각각 한 줄, 우측정렬) */}
          <div style={{ textAlign: 'right', flexShrink: 0, whiteSpace: 'nowrap' }}>
            <div>
              <Text typography="t6" fontWeight="bold" color={colors.grey900}>
                {price(row.close, currency)}
              </Text>
            </div>
            <div style={{ marginTop: 2 }}>
              <Text typography="st12" color={signColor(row.change_pct)}>
                {pct(row.change_pct)}
                {!isUS && ` · 괴리 ${pct(row.premium_pct)}`}
              </Text>
            </div>
          </div>
        </div>
      }
    />
  );
}
