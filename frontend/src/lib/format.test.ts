import { describe, it, expect } from 'vitest';
import { fmt, pct, signColor, won억, price, marketCap } from './format';

describe('fmt', () => {
  it('null/undefined → 대시', () => {
    expect(fmt(null)).toBe('-');
    expect(fmt(undefined)).toBe('-');
  });
  it('천단위 구분', () => {
    expect(fmt(1234567)).toBe('1,234,567');
  });
});

describe('pct', () => {
  it('양수는 + 부호, 음수는 그대로', () => {
    expect(pct(1.5)).toBe('+1.5%');
    expect(pct(-2.34)).toBe('-2.34%');
    expect(pct(0)).toBe('0%');
  });
  it('null → 대시', () => {
    expect(pct(null)).toBe('-');
  });
});

describe('signColor', () => {
  it('한국식: 상승=빨강, 하락=파랑, 0/null=회색', () => {
    expect(signColor(1)).toBe('#f04452'); // red500
    expect(signColor(-1)).toBe('#3182f6'); // blue500
    expect(signColor(0)).not.toBe('#f04452');
    expect(signColor(null)).not.toBe('#f04452');
  });
});

describe('won억', () => {
  it('1만 미만은 억, 1만 이상은 조', () => {
    expect(won억(5000)).toBe('5,000억');
    expect(won억(10000)).toBe('1조');
    expect(won억(16058)).toBe('1.6조');
  });
  it('null → 대시', () => {
    expect(won억(null)).toBe('-');
  });
});

describe('price', () => {
  it('KRW는 원, USD는 $·소수2자리', () => {
    expect(price(15405, 'KRW')).toBe('15,405원');
    expect(price(31.86, 'USD')).toBe('$31.86');
    expect(price(31, 'USD')).toBe('$31.00');
  });
  it('null → 대시', () => {
    expect(price(null, 'USD')).toBe('-');
  });
});

describe('marketCap', () => {
  it('USD는 $ 접두', () => {
    expect(marketCap(7836, 'USD')).toBe('$7,836억');
    expect(marketCap(39000, 'KRW')).toBe('3.9조');
  });
});
