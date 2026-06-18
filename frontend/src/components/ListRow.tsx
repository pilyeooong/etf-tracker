import { useNavigate } from 'react-router-dom';
import { ListRow as TdsListRow, Text } from '@toss/tds-mobile';
import { colors } from '@toss/tds-colors';
import { pct, price, signColor } from '@/lib/format';
import { maybeShowInterstitial } from '@/lib/interstitial';
import type { EtfListRow } from '@/types/etf';

const ellipsis = {
  display: 'block',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
} as const;

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
          <div style={{ minWidth: 0 }}>
            <Text typography="t6" fontWeight="bold" color={colors.grey900} style={ellipsis}>
              {name}
            </Text>
            <Text typography="st12" color={colors.grey500} style={{ display: 'block', marginTop: 2 }}>
              {row.code} · {row.etf_meta?.category ?? '-'}
            </Text>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <Text typography="t6" fontWeight="bold" color={colors.grey900} style={{ display: 'block' }}>
              {price(row.close, currency)}
            </Text>
            <Text typography="st12" color={signColor(row.change_pct)} style={{ display: 'block', marginTop: 2 }}>
              {pct(row.change_pct)}
              {!isUS && ` · 괴리 ${pct(row.premium_pct)}`}
            </Text>
          </div>
        </div>
      }
    />
  );
}
