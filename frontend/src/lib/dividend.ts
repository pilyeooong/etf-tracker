// 분배(배당) 관련 순수 헬퍼 — UI 비의존이라 단위 테스트 대상.

// "1,4,7,10" → [1,4,7,10] (1~12만, 정렬·중복 제거)
export function parseMonths(raw: string | null | undefined): number[] {
  if (!raw) return [];
  const set = new Set<number>();
  for (const part of raw.split(',')) {
    const n = parseInt(part.trim(), 10);
    if (n >= 1 && n <= 12) set.add(n);
  }
  return [...set].sort((a, b) => a - b);
}

// 확실한 패턴만 라벨링: 연속 4개월↑=월배당, 모두 3개월 간격=분기배당. 애매하면 null(허위 단정 회피).
export function freqLabel(months: number[]): string | null {
  if (months.length < 2) return null;
  const gaps = months.slice(1).map((m, i) => m - months[i]);
  if (gaps.every((g) => g === 1) && months.length >= 4) return '월배당';
  if (gaps.every((g) => g === 3)) return '분기배당';
  return null;
}

// 순유입 문자열 부호(유출은 '-' 접두). 정확히 0이면 0, 그 외 양수.
export function flowSign(s: string | null | undefined): number {
  if (!s) return 0;
  const t = s.trim();
  if (t.startsWith('-')) return -1;
  if (/^0(억|만|원|조)?$/.test(t) || t === '0') return 0;
  return 1;
}
