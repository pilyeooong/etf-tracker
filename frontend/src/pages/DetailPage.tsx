import { useNavigate, useParams } from 'react-router-dom';
import { Text } from '@toss/tds-mobile';
import { colors } from '@toss/tds-colors';
import { BannerSlot } from '@/components/BannerSlot';
import { BackIcon } from '@/components/icons';
import { AD_IDS } from '@/lib/ads';
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
  Other: '기타',
};
// 섹터 합산이 안 맞는 잔여/미분류 버킷(가중치 음수·100% 초과)은 노이즈라 숨김
const SECTOR_EXCLUDE = new Set(['UNCLASSIFIED']);

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
  // 섹터는 0%/null 슬라이스 제외(상품형·채권형은 섹터가 전부 0이라 노이즈)
  const sectors: PortfolioSlice[] = (detail?.sector_portfolio ?? [])
    .filter((s) => (s.weight ?? 0) > 0 && !SECTOR_EXCLUDE.has(s.code ?? ''))
    .slice(0, 8);
  const sourceNote = isUS ? '네이버 금융, stockanalysis.com' : '네이버 금융';

  return (
    <div style={{ padding: '8px 16px 88px', maxWidth: 560, margin: '0 auto' }}>
      <button
        onClick={() => navigate(-1)}
        aria-label="뒤로"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px 4px 8px 0', display: 'inline-flex' }}
      >
        <BackIcon size={24} color={colors.grey700} />
      </button>

      {/* 헤더 */}
      <div style={{ marginBottom: 6 }}>
        <Text typography="t4" fontWeight="bold" color={colors.grey900}>
          {meta.name}
        </Text>
        <div style={{ marginTop: 2 }}>
          <Text typography="st12" color={colors.grey500}>
            {meta.code} · {isUS ? '미국 상장' : meta.issuer ?? '-'}
            {meta.base_index ? ` · ${meta.base_index}` : isUS && meta.category ? ` · ${meta.category}` : ''}
          </Text>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, margin: '10px 0 4px' }}>
        <Text typography="t2" fontWeight="bold" color={colors.grey900}>
          {price(quote?.close, cur)}
        </Text>
        <Text typography="t6" fontWeight="bold" color={signColor(quote?.change_pct)}>
          {pct(quote?.change_pct)}
        </Text>
      </div>
      {/* KR만 NAV/괴리율/추적오차 (미국 ETF는 무의미) */}
      {!isUS && (
        <div style={{ marginBottom: 16 }}>
          <Text typography="st12" color={colors.grey500}>
            NAV {fmt(quote?.nav ?? detail?.nav)}원 · 괴리율{' '}
          </Text>
          <Text typography="st12" fontWeight="bold" color={signColor(quote?.premium_pct)}>
            {pct(quote?.premium_pct)}
          </Text>
          {detail?.chase_error_rate != null && (
            <Text typography="st12" color={colors.grey500}>
              {' '}· 추적오차 {pct(detail.chase_error_rate)}
            </Text>
          )}
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
                <Text typography="st12" color={colors.grey500}>
                  {PERIOD_LABEL[p.period]}
                </Text>
                <div style={{ marginTop: 3 }}>
                  <Text typography="t6" fontWeight="bold" color={signColor(p.value)}>
                    {pct(p.value)}
                  </Text>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* 본문 중간 — 피드형(네이티브 이미지) 배너 */}
      <BannerSlot inline adGroupId={AD_IDS.nativeImage} />

      {/* 주요 구성종목 */}
      {holdings.length > 0 && (
        <Section title="주요 구성종목">
          {holdings.map((h) => (
            <WeightBar key={`${h.stock_code}-${h.stock_name}`} name={h.stock_name} weight={h.weight} />
          ))}
        </Section>
      )}

      {/* 섹터 비중 (0% 슬라이스 제외) */}
      {sectors.length > 0 && (
        <Section title="섹터 비중">
          {sectors.map((s) => (
            <WeightBar key={s.code} name={SECTOR_LABEL[s.code ?? ''] ?? s.code ?? '-'} weight={s.weight} />
          ))}
        </Section>
      )}

      {/* 설명 */}
      {detail?.summary && (
        <Section title="상품 설명">
          <p
            style={{ fontSize: 13, color: colors.grey700, lineHeight: 1.7, margin: 0 }}
            dangerouslySetInnerHTML={{ __html: detail.summary }}
          />
        </Section>
      )}

      <div style={{ marginTop: 20, lineHeight: 1.6 }}>
        <Text typography="st13" color={colors.grey400}>
          모든 수치는 참고용 추정치이며 실제와 다를 수 있습니다. 본 정보는 투자 권유가 아니며, 투자 판단의
          책임은 이용자 본인에게 있습니다. 데이터 출처: {sourceNote}.
        </Text>
      </div>
    </div>
  );
}

function WeightBar({ name, weight }: { name: string; weight: number | null }) {
  const hasWeight = weight != null;
  return (
    <div style={{ margin: '9px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: hasWeight ? 4 : 0 }}>
        <Text typography="st12" color={colors.grey900}>
          {name}
        </Text>
        {hasWeight && (
          <Text typography="st12" fontWeight="bold" color={colors.grey700}>
            {weight}%
          </Text>
        )}
      </div>
      {/* 비중 값이 없으면(현금·선물 등) 빈 막대 대신 이름만 표시 */}
      {hasWeight && (
        <div style={{ height: 6, background: colors.grey100, borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ width: `${Math.min(weight, 100)}%`, height: '100%', background: colors.blue500, borderRadius: 3 }} />
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ marginBottom: 12 }}>
        <Text typography="t6" fontWeight="bold" color={colors.grey900}>
          {title}
        </Text>
      </div>
      {children}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div style={{ background: colors.grey50, borderRadius: 14, padding: 16 }}>{children}</div>;
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px 8px' }}>{children}</div>
  );
}

function Cell({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div>
      <div style={{ marginBottom: 3 }}>
        <Text typography="st13" color={colors.grey500}>
          {label}
        </Text>
      </div>
      <Text typography={small ? 'st12' : 't7'} fontWeight="bold" color={colors.grey900}>
        {value}
      </Text>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: '80px 16px', textAlign: 'center' }}>
      <Text typography="t7" color={colors.grey500}>
        {children}
      </Text>
    </div>
  );
}
