import { colors } from '@toss/tds-colors';

export function fmt(n: number | null | undefined, digits = 0): string {
  if (n === null || n === undefined) return '-';
  return n.toLocaleString('ko-KR', { maximumFractionDigits: digits });
}

export function pct(n: number | null | undefined, digits = 2): string {
  if (n === null || n === undefined) return '-';
  return `${n > 0 ? '+' : ''}${n.toLocaleString('ko-KR', { maximumFractionDigits: digits })}%`;
}

// 한국식 등락 색상: 상승=빨강, 하락=파랑 (TDS 컬러 토큰)
export function signColor(n: number | null | undefined): string {
  if (n === null || n === undefined) return colors.grey500;
  if (n > 0) return colors.red500;
  if (n < 0) return colors.blue500;
  return colors.grey500;
}

// 억원 → 사람이 읽는 단위(조/억)
export function won억(n: number | null | undefined): string {
  if (n === null || n === undefined) return '-';
  if (n >= 10000) return `${(n / 10000).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}조`;
  return `${n.toLocaleString('ko-KR')}억`;
}

// 통화 인식 가격: KRW는 정수+원, USD는 소수2자리+$
export function price(n: number | null | undefined, currency = 'KRW'): string {
  if (n === null || n === undefined) return '-';
  if (currency === 'USD') {
    return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${n.toLocaleString('ko-KR')}원`;
}

// 시총 단위: KR=억원(조/억), US=억 USD($..B/$..M 대신 한글 단위 유지)
export function marketCap(n: number | null | undefined, currency = 'KRW'): string {
  if (n === null || n === undefined) return '-';
  const unit = won억(n);
  return currency === 'USD' ? `$${unit}` : unit;
}
