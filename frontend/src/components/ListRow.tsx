import { useNavigate } from 'react-router-dom';
import { pct, price, signColor } from '@/lib/format';
import { maybeShowInterstitial } from '@/lib/interstitial';
import type { EtfListRow } from '@/types/etf';

export function ListRow({ row }: { row: EtfListRow }) {
  const navigate = useNavigate();
  const name = row.etf_meta?.name ?? row.code;
  const currency = row.etf_meta?.currency ?? 'KRW';
  const isUS = row.etf_meta?.market === 'US';
  return (
    <button
      onClick={() => {
        navigate(`/etf/${row.code}`);
        maybeShowInterstitial(); // 빈도 조건 충족 시에만 전면 광고
      }}
      style={{
        display: 'flex',
        width: '100%',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '14px 4px',
        borderBottom: '1px solid #f2f4f6',
        background: 'none',
        border: 'none',
        borderBottomStyle: 'solid',
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <div style={{ minWidth: 0, paddingRight: 12 }}>
        <div
          style={{
            fontWeight: 600,
            fontSize: 15,
            color: '#191f28',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {name}
        </div>
        <div style={{ fontSize: 12, color: '#8b95a1', marginTop: 2 }}>
          {row.code} · {row.etf_meta?.category ?? '-'}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#191f28' }}>
          {price(row.close, currency)}
        </div>
        <div style={{ fontSize: 12, color: signColor(row.change_pct), marginTop: 2 }}>
          {pct(row.change_pct)}
          {!isUS && <> · 괴리 {pct(row.premium_pct)}</>}
        </div>
      </div>
    </button>
  );
}
