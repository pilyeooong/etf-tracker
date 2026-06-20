import { useState } from 'react';
import { Text } from '@toss/tds-mobile';
import { colors } from '@toss/tds-colors';
import { AdGate } from '@/components/AdGate';
import { useAsync } from '@/hooks/useAsync';
import { fetchPeerComparison } from '@/lib/queries';
import type { PeerComparison, PeerMetric } from '@/lib/queries';
import type { EtfDetail, EtfHolding, EtfMeta, Market, NetInflow } from '@/types/etf';

// 리워드 게이트 + 지연 페치 래퍼. 상세 화면에 그대로 꽂아 써요(자체 훅 보유).
export function DeepAnalysisSection({
  meta,
  detail,
  holdings,
}: {
  meta: EtfMeta;
  detail: EtfDetail | null;
  holdings: EtfHolding[];
}) {
  const [revealed, setRevealed] = useState(false);
  const comparison = useAsync(
    () => (revealed ? fetchPeerComparison(meta, detail) : Promise.resolve(null)),
    [revealed, meta.code],
  );

  const hasConc = holdings.filter((h) => h.weight != null && h.weight > 0).length >= 3;
  const maybeHasPeer = Boolean(meta.base_index || meta.category);
  const hasDiv = Boolean(detail?.dividend_months);
  const hasFlow = Boolean(detail?.net_inflow);
  if (!maybeHasPeer && !hasConc && !hasDiv && !hasFlow) return null; // 재료가 전혀 없으면 숨김

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ marginBottom: 12 }}>
        <Text typography="t6" fontWeight="bold" color={colors.grey900}>
          심화 분석
        </Text>
      </div>
      {!revealed ? (
        <>
          <div style={{ marginBottom: 12, lineHeight: 1.6 }}>
            <Text typography="st12" color={colors.grey500}>
              동종 ETF 중 위치·구성 집중도, 분배 캘린더와 자금 유입 흐름을 광고 시청 후 확인할 수 있어요.
            </Text>
          </div>
          <AdGate cta="광고 보고 심화 분석 보기" onRewardGranted={() => setRevealed(true)} />
        </>
      ) : comparison.loading ? (
        <Text typography="st12" color={colors.grey500}>
          분석 중…
        </Text>
      ) : comparison.data || hasConc || hasDiv || hasFlow ? (
        <DeepAnalysis
          comparison={comparison.data ?? null}
          holdings={holdings}
          detail={detail}
          market={meta.market}
        />
      ) : (
        <Text typography="st12" color={colors.grey400}>
          동종 그룹 데이터가 부족해 분석을 제공하기 어려워요.
        </Text>
      )}
    </div>
  );
}

// 보유 데이터로 산출하는 심화 분석: 동종 그룹 내 상대 위치 + 구성 집중도.
// 모두 객관적 통계(사실)이며 매수/매도 권유·종합 등급이 아니에요.
export function DeepAnalysis({
  comparison,
  holdings,
  detail,
  market,
}: {
  comparison: PeerComparison | null;
  holdings: EtfHolding[];
  detail?: EtfDetail | null;
  market?: Market;
}) {
  const weighted = holdings.filter((h) => h.weight != null && h.weight > 0);
  const top10 = weighted.reduce((a, h) => a + (h.weight ?? 0), 0);
  const top3 = weighted.slice(0, 3).reduce((a, h) => a + (h.weight ?? 0), 0);
  const hasConc = weighted.length >= 3;
  const concLabel = top3 >= 55 ? '집중형' : top3 >= 30 ? '보통' : '분산형';

  const anyAbove = Boolean(comparison) || hasConc;

  return (
    <div>
      {comparison && (
        <>
          <div style={{ marginBottom: 4 }}>
            <Text typography="st12" color={colors.grey500}>
              {comparison.groupLabel} · {comparison.count}개 ETF 중 위치
            </Text>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 10 }}>
            {comparison.metrics.map((m) => (
              <MetricRow key={m.key} m={m} />
            ))}
          </div>
        </>
      )}

      {hasConc && (
        <div style={{ marginTop: comparison ? 26 : 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
            <Text typography="st11" fontWeight="bold" color={colors.grey900}>
              구성 집중도
            </Text>
            <Text typography="st12" fontWeight="bold" color={colors.blue500}>
              {concLabel}
            </Text>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <ConcCell label="상위 3종목" value={top3} />
            <ConcCell label="상위 10종목" value={top10} />
          </div>
          <div style={{ marginTop: 8 }}>
            <Text typography="st13" color={colors.grey400}>
              상위 3종목 비중이 높을수록 소수 종목 쏠림이 커요(TOP10 기준).
            </Text>
          </div>
        </div>
      )}

      <DividendCalendar detail={detail} topMargin={anyAbove ? 26 : 0} />
      {market !== 'US' && <NetFlow flow={detail?.net_inflow ?? null} />}
    </div>
  );
}

// 분배 캘린더: 올해 지급 월·횟수 + TTM 분배수익률·주당분배금. 빈도 라벨은 확실할 때만(허위 단정 회피).
// 지급 월 데이터(KR)가 있을 때만 렌더. US는 월/횟수가 없고 분배 정보가 헤더에 이미 있어 숨김.
function DividendCalendar({ detail, topMargin }: { detail?: EtfDetail | null; topMargin: number }) {
  if (!detail) return null;
  const months = parseMonths(detail.dividend_months);
  if (months.length === 0) return null;
  const label = freqLabel(months);

  return (
    <div style={{ marginTop: topMargin }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
        <Text typography="st11" fontWeight="bold" color={colors.grey900}>
          분배 캘린더
        </Text>
        {label && (
          <Text typography="st12" fontWeight="bold" color={colors.blue500}>
            {label}
          </Text>
        )}
      </div>

      {months.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((mo) => {
            const on = months.includes(mo);
            return (
              <div
                key={mo}
                style={{
                  minWidth: 34,
                  textAlign: 'center',
                  padding: '5px 0',
                  borderRadius: 8,
                  background: on ? colors.blue50 : colors.grey50,
                }}
              >
                <Text
                  typography="st13"
                  fontWeight={on ? 'bold' : 'regular'}
                  color={on ? colors.blue500 : colors.grey400}
                >
                  {mo}월
                </Text>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        {detail.dividend_yield != null && (
          <ConcCell label="분배수익률(TTM)" value={detail.dividend_yield} suffix="%" />
        )}
        {detail.dividend_count_year != null && (
          <ConcCell label="올해 지급" value={detail.dividend_count_year} suffix="회" decimals={0} />
        )}
      </div>
      {detail.dividend_per_share != null && (
        <div style={{ marginTop: 8 }}>
          <Text typography="st13" color={colors.grey400}>
            주당 분배금(TTM) {Math.round(detail.dividend_per_share).toLocaleString()}원
          </Text>
        </div>
      )}
    </div>
  );
}

// 자금흐름: 최근 순유입(1주/1개월/3개월). 1개월 부호로 유입/유출세 라벨. KR만.
function NetFlow({ flow }: { flow: NetInflow | null }) {
  if (!flow) return null;
  const rows: { label: string; value?: string | null }[] = [
    { label: '최근 1주', value: flow.cumulativeNetInflow1w },
    { label: '최근 1개월', value: flow.cumulativeNetInflow1m },
    { label: '최근 3개월', value: flow.cumulativeNetInflow3m },
  ].filter((r) => r.value);
  if (rows.length === 0) return null;
  const sign = flowSign(flow.cumulativeNetInflow1m);
  const tone = sign > 0 ? '유입세' : sign < 0 ? '유출세' : null;

  return (
    <div style={{ marginTop: 26 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
        <Text typography="st11" fontWeight="bold" color={colors.grey900}>
          자금 흐름
        </Text>
        {tone && (
          <Text typography="st12" fontWeight="bold" color={sign > 0 ? colors.blue500 : colors.red500}>
            최근 한 달 {tone}
          </Text>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.map((r) => {
          const s = flowSign(r.value);
          return (
            <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Text typography="st12" color={colors.grey500}>
                {r.label}
              </Text>
              <Text
                typography="st12"
                fontWeight="bold"
                color={s < 0 ? colors.red500 : s > 0 ? colors.blue500 : colors.grey700}
              >
                {s > 0 ? '+' : ''}
                {r.value}
              </Text>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 8 }}>
        <Text typography="st13" color={colors.grey400}>
          순유입은 설정·환매로 늘고 준 순자산 변화예요. 가격 등락과는 달라요.
        </Text>
      </div>
    </div>
  );
}

// "1,4,7,10" → [1,4,7,10] (1~12만, 정렬·중복 제거)
function parseMonths(raw: string | null | undefined): number[] {
  if (!raw) return [];
  const set = new Set<number>();
  for (const part of raw.split(',')) {
    const n = parseInt(part.trim(), 10);
    if (n >= 1 && n <= 12) set.add(n);
  }
  return [...set].sort((a, b) => a - b);
}

// 확실한 패턴만 라벨링: 연속 4개월↑=월, 모두 3개월 간격=분기. 애매하면 null.
function freqLabel(months: number[]): string | null {
  if (months.length < 2) return null;
  const gaps = months.slice(1).map((m, i) => m - months[i]);
  if (gaps.every((g) => g === 1) && months.length >= 4) return '월배당';
  if (gaps.every((g) => g === 3)) return '분기배당';
  return null;
}

// 순유입 문자열 부호(유출은 '-' 접두). 0이면 0.
function flowSign(s: string | null | undefined): number {
  if (!s) return 0;
  const t = s.trim();
  if (t.startsWith('-')) return -1;
  if (/^0(억|만|원|조)?$/.test(t) || t === '0') return 0;
  return 1;
}

function MetricRow({ m }: { m: PeerMetric }) {
  // 마커는 '순위 백분위'로 배치(왼쪽=1위/좋은 쪽). 순위 텍스트와 어긋나지 않게.
  const frac = m.total <= 1 ? 0.5 : (m.rank - 1) / (m.total - 1);
  const left = `${Math.min(98, Math.max(2, frac * 100))}%`;
  const isTop = m.rank === 1;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <Text typography="st12" color={colors.grey500}>
          {m.label}
        </Text>
        <div>
          <Text typography="st12" fontWeight="bold" color={colors.grey900}>
            {fmtPct(m.value)}
          </Text>
          <Text typography="st12" color={colors.grey400}>
            {' '}
            · {m.total}개 중{' '}
          </Text>
          <Text typography="st12" fontWeight="bold" color={isTop ? colors.blue500 : colors.grey700}>
            {m.rank}위
          </Text>
        </div>
      </div>
      <div style={{ position: 'relative', height: 6, background: colors.grey100, borderRadius: 3 }}>
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left,
            width: 12,
            height: 12,
            borderRadius: 6,
            background: colors.blue500,
            border: `2px solid ${colors.white}`,
            transform: 'translate(-50%, -50%)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
          }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
        <Text typography="st13" color={colors.grey400}>
          {m.better === 'low' ? '낮음' : '높음'} {fmtPct(m.better === 'low' ? m.min : m.max)}
        </Text>
        <Text typography="st13" color={colors.grey400}>
          {fmtPct(m.better === 'low' ? m.max : m.min)} {m.better === 'low' ? '높음' : '낮음'}
        </Text>
      </div>
    </div>
  );
}

function ConcCell({
  label,
  value,
  suffix = '%',
  decimals = 1,
}: {
  label: string;
  value: number;
  suffix?: string;
  decimals?: number;
}) {
  return (
    <div style={{ flex: 1, background: colors.grey50, borderRadius: 12, padding: '12px 14px' }}>
      <div style={{ marginBottom: 4 }}>
        <Text typography="st13" color={colors.grey500}>
          {label}
        </Text>
      </div>
      <Text typography="t5" fontWeight="bold" color={colors.grey900}>
        {value.toFixed(decimals)}
        {suffix}
      </Text>
    </div>
  );
}

function fmtPct(v: number): string {
  return `${Number(v.toFixed(2))}%`;
}
