import { useNavigate, useParams } from 'react-router-dom';
import { useAsync } from '@/hooks/useAsync';
import { fetchDetailBundle } from '@/lib/queries';
import { fmt, marketCap, pct, price, signColor, won억 } from '@/lib/format';
import type { PeriodReturn, PortfolioSlice } from '@/types/etf';

const PERIOD_LABEL: Record<string, string> = {
  M1: '1개월',
  M3: '3개월',
  M6: '6개월',
  Y1: '1년',
};
const SECTOR_LABEL: Record<string, string> = {
  IT: 'IT',
  FINANCIALS: '금융',
  COMMUNICATION: '커뮤니케이션',
  CONSUMER_DISCRETIONARY: '경기소비재',
  CONSUMER_STAPLES: '필수소비재',
  INDUSTRIALS: '산업재',
  HEALTHCARE: '헬스케어',
  ENERGY: '에너지',
  MATERIALS: '소재',
  UTILITIES: '유틸리티',
  REAL_ESTATE: '부동산',
  ETC: '기타',
};

export function DetailPage() {
  const { code = '' } = useParams();
  const navigate = useNavigate();
  const { data, loading, error } = useAsync(() => fetchDetailBundle(code), [code]);

  if (loading) return <Centered>불러오는 중…</Centered>;
  if (error) return <Centered>오류: {error}</Centered>;
  if (!data?.meta) return <Centered>종목을 찾을 수 없습니다.</Centered>;

  const { meta, quote, detail, holdings } = data;
  const isUS = meta.market === 'US';
  const cur = meta.currency ?? 'KRW';
  const periods: PeriodReturn[] = (detail?.returns ?? []).filter((r) =>
    PERIOD_LABEL[r.period],
  );

  return (
    <div style={{ padding: '8px 16px 88px', maxWidth: 560, margin: '0 auto' }}>
      <button
        onClick={() => navigate(-1)}
        style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', padding: '8px 0', color: '#4e5968' }}
      >
        ←
      </button>

      {/* 헤더 */}
      <div style={{ marginBottom: 6 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: '#191f28' }}>{meta.name}</h1>
        <div style={{ fontSize: 13, color: '#8b95a1', marginTop: 2 }}>
          {meta.code} · {isUS ? '🇺🇸 미국 상장' : meta.issuer ?? '-'}
          {meta.base_index ? ` · ${meta.base_index}` : isUS && meta.category ? ` · ${meta.category}` : ''}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, margin: '10px 0 4px' }}>
        <span style={{ fontSize: 28, fontWeight: 800, color: '#191f28' }}>
          {price(quote?.close, cur)}
        </span>
        <span style={{ fontSize: 15, fontWeight: 700, color: signColor(quote?.change_pct) }}>
          {pct(quote?.change_pct)}
        </span>
      </div>
      {/* KR만 NAV/괴리율/추적오차 (미국 ETF는 무의미) */}
      {!isUS && (
        <div style={{ fontSize: 13, color: '#8b95a1', marginBottom: 16 }}>
          NAV {fmt(detail?.nav ?? quote?.nav)}원 · 괴리율{' '}
          <b style={{ color: signColor(quote?.premium_pct) }}>{pct(quote?.premium_pct)}</b>
          {detail?.chase_error_rate != null && <> · 추적오차 {pct(detail.chase_error_rate)}</>}
        </div>
      )}
      {isUS && <div style={{ marginBottom: 16 }} />}

      {/* 요약 그리드 */}
      <Card>
        <Grid>
          {isUS ? (
            <>
              <Cell label="총보수" value={meta.fee_pct != null ? `${meta.fee_pct}%` : '-'} />
              <Cell label="분배수익률" value={detail?.dividend_yield != null ? `${detail.dividend_yield}%` : '-'} />
              <Cell label="주당 분배금" value={detail?.dividend_per_share != null ? `$${detail.dividend_per_share}` : '-'} />
              <Cell label="시가총액" value={marketCap(quote?.market_cap, cur)} />
              <Cell label="거래대금" value={marketCap(quote?.trading_value, cur)} />
              <Cell label="거래량" value={fmt(quote?.volume)} />
            </>
          ) : (
            <>
              <Cell label="총보수" value={meta.fee_pct != null ? `${meta.fee_pct}%` : '-'} />
              <Cell label="분배수익률" value={detail?.dividend_yield != null ? `${detail.dividend_yield}%` : '-'} />
              <Cell label="시가총액" value={marketCap(quote?.market_cap, cur)} />
              <Cell label="거래대금" value={quote?.trading_value != null ? won억(Math.round(quote.trading_value / 100)) : '-'} />
              <Cell label="상장일" value={meta.listing_date ?? '-'} />
              <Cell label="과세유형" value={meta.tax_category ?? '-'} small />
            </>
          )}
        </Grid>
      </Card>

      {/* 기간 수익률 */}
      {periods.length > 0 && (
        <Section title="기간 수익률">
          <div style={{ display: 'flex', gap: 8 }}>
            {periods.map((p) => (
              <div key={p.period} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: '#8b95a1' }}>{PERIOD_LABEL[p.period]}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: signColor(p.value), marginTop: 3 }}>
                  {pct(p.value)}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* 구성종목 TOP10 */}
      {holdings.length > 0 && (
        <Section title={`구성종목 TOP${holdings.length}`}>
          {holdings.map((h) => (
            <WeightBar key={`${h.stock_code}-${h.stock_name}`} name={h.stock_name} weight={h.weight} />
          ))}
        </Section>
      )}

      {/* 섹터 비중 */}
      {detail?.sector_portfolio && detail.sector_portfolio.length > 0 && (
        <Section title="섹터 비중">
          {detail.sector_portfolio.slice(0, 8).map((s: PortfolioSlice) => (
            <WeightBar key={s.code} name={SECTOR_LABEL[s.code ?? ''] ?? s.code ?? '-'} weight={s.weight} />
          ))}
        </Section>
      )}

      {/* 설명 */}
      {detail?.summary && (
        <Section title="상품 설명">
          <p
            style={{ fontSize: 13, color: '#4e5968', lineHeight: 1.7, margin: 0 }}
            dangerouslySetInnerHTML={{ __html: detail.summary }}
          />
        </Section>
      )}

      <p style={{ fontSize: 11, color: '#b0b8c1', lineHeight: 1.6, marginTop: 20 }}>
        모든 수치는 참고용 추정치이며 실제와 다를 수 있습니다. 본 정보는 투자 권유가 아니며, 투자 판단의
        책임은 이용자 본인에게 있습니다. 데이터 출처: 네이버 금융.
      </p>
    </div>
  );
}

function WeightBar({ name, weight }: { name: string; weight: number | null }) {
  const w = weight ?? 0;
  return (
    <div style={{ margin: '9px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
        <span style={{ color: '#191f28', fontWeight: 500 }}>{name}</span>
        <span style={{ color: '#4e5968', fontWeight: 600 }}>{weight != null ? `${weight}%` : '-'}</span>
      </div>
      <div style={{ height: 6, background: '#f2f4f6', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(w, 100)}%`, height: '100%', background: '#3182f6', borderRadius: 3 }} />
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 24 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px', color: '#191f28' }}>{title}</h2>
      {children}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div style={{ background: '#f9fafb', borderRadius: 14, padding: 16 }}>{children}</div>;
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px 8px' }}>{children}</div>
  );
}

function Cell({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: '#8b95a1', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: small ? 12 : 14, fontWeight: 600, color: '#191f28', lineHeight: 1.3 }}>
        {value}
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: '80px 16px', textAlign: 'center', color: '#8b95a1', fontSize: 14 }}>
      {children}
    </div>
  );
}
