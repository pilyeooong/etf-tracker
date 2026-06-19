import { selectFrom } from '@/lib/supabase';
import type {
  EtfDetail,
  EtfHolding,
  EtfListRow,
  Market,
  EtfMeta,
  EtfQuote,
} from '@/types/etf';

const LIST_SELECT =
  'select=code,date,close,change_pct,premium_pct,volume,etf_meta!inner(name,category,tags,market,currency)';

let _latestDate: string | null = null;

// 최신 거래일 (한 번 조회 후 캐시)
export async function latestDate(): Promise<string | null> {
  if (_latestDate) return _latestDate;
  const rows = await selectFrom('etf_daily_quote', 'select=date&order=date.desc&limit=1');
  _latestDate = rows.length > 0 ? rows[0].date : null;
  return _latestDate;
}

export type ListMode = 'volume' | 'gainers' | 'losers';

export async function fetchTopList(
  mode: ListMode,
  market: Market = 'KR',
  limit = 30,
  offset = 0,
): Promise<EtfListRow[]> {
  const date = await latestDate();
  if (!date) return [];
  const order =
    mode === 'volume'
      ? 'volume.desc'
      : mode === 'gainers'
        ? 'change_pct.desc'
        : 'change_pct.asc';
  // 동순위 안정 정렬을 위해 code 보조키 추가(offset 페이지네이션 일관성)
  const q =
    `${LIST_SELECT}&date=eq.${date}&etf_meta.market=eq.${market}` +
    `&order=${order},code.asc&limit=${limit}&offset=${offset}`;
  return selectFrom('etf_daily_quote', q);
}

export async function searchByName(query: string, limit = 40): Promise<EtfListRow[]> {
  const date = await latestDate();
  if (!date) return [];
  const enc = encodeURIComponent(`*${query}*`);
  const q = `${LIST_SELECT}&date=eq.${date}&etf_meta.name=ilike.${enc}&order=volume.desc&limit=${limit}`;
  return selectFrom('etf_daily_quote', q);
}

// 특정 종목명을 담은 ETF 역검색 (예: '삼성전자' → 그 종목 보유 ETF)
export async function searchByHolding(query: string, limit = 40): Promise<EtfListRow[]> {
  const date = await latestDate();
  if (!date) return [];
  const enc = encodeURIComponent(`*${query}*`);
  const hits: { code: string }[] = await selectFrom(
    'etf_holding',
    `select=code&stock_name=ilike.${enc}&limit=200`,
  );
  const codes = [...new Set(hits.map((h) => h.code))].slice(0, limit);
  if (codes.length === 0) return [];
  const inList = `(${codes.join(',')})`;
  return selectFrom(
    'etf_daily_quote',
    `${LIST_SELECT}&date=eq.${date}&code=in.${inList}&order=volume.desc`,
  );
}

export async function searchByTag(tag: string, limit = 40): Promise<EtfListRow[]> {
  const date = await latestDate();
  if (!date) return [];
  const enc = encodeURIComponent(`{${tag}}`);
  const q = `${LIST_SELECT}&date=eq.${date}&etf_meta.tags=cs.${enc}&order=volume.desc&limit=${limit}`;
  return selectFrom('etf_daily_quote', q);
}

export interface DetailBundle {
  meta: EtfMeta | null;
  quote: EtfQuote | null;
  detail: EtfDetail | null;
  holdings: EtfHolding[];
}

// 비교용: 여러 종목의 상세 묶음을 한 번에
export async function fetchCompareData(codes: string[]): Promise<DetailBundle[]> {
  return Promise.all(codes.map(fetchDetailBundle));
}

export async function fetchDetailBundle(code: string): Promise<DetailBundle> {
  const c = encodeURIComponent(code);
  const [meta, quote, detail, holdings] = await Promise.all([
    selectFrom('etf_meta', `select=*&code=eq.${c}&limit=1`),
    selectFrom('etf_daily_quote', `select=*&code=eq.${c}&order=date.desc&limit=1`),
    selectFrom('etf_detail', `select=*&code=eq.${c}&limit=1`),
    selectFrom('etf_holding', `select=*&code=eq.${c}&order=seq.asc`),
  ]);
  return {
    meta: meta[0] ?? null,
    quote: quote[0] ?? null,
    detail: detail[0] ?? null,
    holdings,
  };
}
