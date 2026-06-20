import { Text } from '@toss/tds-mobile';
import { colors } from '@toss/tds-colors';

// 비중(구성종목·섹터) 도넛 차트. 차트 라이브러리 없이 순수 SVG(stroke-dasharray)로 그려요.
// 카테고리 구분용 팔레트 — TDS는 범주형 팔레트를 따로 노출하지 않아 직접 정의(토스 블루 선두).
const PALETTE = [
  '#3182F6', // toss blue
  '#00C2FF',
  '#8B5CF6',
  '#FF9500',
  '#FF5A5F',
  '#22C55E',
  '#FFC043',
  '#EC4899',
  '#14B8A6',
  '#94A3B8',
];
const REMAINDER_COLOR = '#E5E8EB';

export interface DonutSlice {
  name: string;
  value: number; // 퍼센트(%) 단위
}

export function DonutChart({
  data,
  remainderLabel = '기타',
  centerLabel,
  centerSub,
}: {
  data: DonutSlice[];
  remainderLabel?: string;
  centerLabel?: string;
  centerSub?: string;
}) {
  // 음수·NaN 슬라이스는 호 계산을 깨뜨리므로 유효한 양수만 사용
  const clean = data.filter((s) => Number.isFinite(s.value) && s.value > 0);
  const sum = clean.reduce((acc, s) => acc + s.value, 0);
  const remainder = Math.max(0, 100 - sum);
  const slices = [
    ...clean.map((s, i) => ({ ...s, color: PALETTE[i % PALETTE.length] })),
    ...(remainder > 0.5 ? [{ name: remainderLabel, value: remainder, color: REMAINDER_COLOR }] : []),
  ];
  const total = slices.reduce((acc, s) => acc + s.value, 0) || 1;

  let acc = 0; // 누적 퍼센트(시작점 계산용)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
      <div style={{ position: 'relative', width: 128, height: 128, flexShrink: 0 }}>
        <svg viewBox="0 0 42 42" width={128} height={128}>
          {/* 트랙 */}
          <circle cx="21" cy="21" r="15.915" fill="none" stroke={colors.grey100} strokeWidth="5" />
          {slices.map((s, i) => {
            const pct = (s.value / total) * 100;
            const dash = `${pct} ${100 - pct}`;
            const offset = 25 - acc; // 12시 방향에서 시계방향 시작
            acc += pct;
            return (
              <circle
                key={`${s.name}-${i}`}
                cx="21"
                cy="21"
                r="15.915"
                fill="none"
                stroke={s.color}
                strokeWidth="5"
                strokeDasharray={dash}
                strokeDashoffset={offset}
              />
            );
          })}
        </svg>
        {centerLabel && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text typography="t4" fontWeight="bold" color={colors.grey900}>
              {centerLabel}
            </Text>
            {centerSub && (
              <Text typography="st13" color={colors.grey500}>
                {centerSub}
              </Text>
            )}
          </div>
        )}
      </div>

      {/* 범례 */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {slices.map((s, i) => (
          <div key={`${s.name}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: s.color, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
              <Text typography="st12" color={colors.grey800} style={{ whiteSpace: 'nowrap' }}>
                {s.name}
              </Text>
            </div>
            <Text typography="st12" fontWeight="bold" color={colors.grey900}>
              {s.value.toFixed(1)}%
            </Text>
          </div>
        ))}
      </div>
    </div>
  );
}
