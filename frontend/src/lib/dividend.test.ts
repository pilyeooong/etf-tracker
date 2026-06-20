import { describe, it, expect } from 'vitest';
import { parseMonths, freqLabel, flowSign } from './dividend';

describe('parseMonths', () => {
  it('파싱·정렬·중복 제거', () => {
    expect(parseMonths('1,4,7,10')).toEqual([1, 4, 7, 10]);
    expect(parseMonths('4, 1, 1, 7')).toEqual([1, 4, 7]);
    expect(parseMonths(' 1 , 2 ,3')).toEqual([1, 2, 3]);
  });
  it('범위 밖·잡값·빈값은 제외', () => {
    expect(parseMonths('0,13,1,abc,7')).toEqual([1, 7]);
    expect(parseMonths('')).toEqual([]);
    expect(parseMonths(null)).toEqual([]);
    expect(parseMonths(undefined)).toEqual([]);
  });
});

describe('freqLabel', () => {
  it('연속 4개월 이상 → 월배당', () => {
    expect(freqLabel([1, 2, 3, 4, 5])).toBe('월배당');
    expect(freqLabel([1, 2, 3, 4])).toBe('월배당');
  });
  it('3개월 간격 → 분기배당', () => {
    expect(freqLabel([1, 4, 7, 10])).toBe('분기배당');
    expect(freqLabel([1, 4])).toBe('분기배당');
  });
  it('애매하면 null (허위 단정 회피)', () => {
    expect(freqLabel([1, 2, 3])).toBeNull(); // 연속이지만 4개 미만
    expect(freqLabel([1, 7])).toBeNull(); // 반기
    expect(freqLabel([1])).toBeNull();
    expect(freqLabel([])).toBeNull();
    expect(freqLabel([1, 3, 6])).toBeNull(); // 불규칙
  });
});

describe('flowSign', () => {
  it('유출은 음수', () => {
    expect(flowSign('-989억')).toBe(-1);
    expect(flowSign('-1조 2,000억')).toBe(-1);
  });
  it('유입은 양수', () => {
    expect(flowSign('9,604억')).toBe(1);
    expect(flowSign('1조 6,058억')).toBe(1);
    expect(flowSign('147억')).toBe(1);
  });
  it('0/빈값은 0', () => {
    expect(flowSign('0')).toBe(0);
    expect(flowSign('0억')).toBe(0);
    expect(flowSign(null)).toBe(0);
    expect(flowSign(undefined)).toBe(0);
    expect(flowSign('')).toBe(0);
  });
});
