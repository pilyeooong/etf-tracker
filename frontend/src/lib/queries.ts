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

// 최신 거래일 — in-flight Promise를 캐시해 콜드 상태 동시 호출의 중복 조회를 막음.
// 실패 시 캐시를 비워 다음 호출이 재시도하도록 함.
let _latestDate: Promise<string | null> | null = null;

export function latestDate(): Promise<string | null> {
  if (!_latestDate) {
    _latestDate = selectFrom('etf_daily_quote', 'select=date&order=date.desc&limit=1')
      .then((rows) => (rows.length > 0 ? rows[0].date : null))
      .catch((e) => {
        _latestDate = null;
        throw e;
      });
  }
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

// 통합 검색: 태그 선택 시 태그검색, 아니면 이름 + 종목 역검색 합쳐서 dedup (홈·비교 공유)
export async function searchEtfs(query: string, tag: string | null): Promise<EtfListRow[]> {
  if (tag) return searchByTag(tag, 50);
  const q = query.trim();
  if (!q) return [];
  const [byName, byHolding] = await Promise.all([searchByName(q, 40), searchByHolding(q, 40)]);
  const seen = new Set<string>();
  const merged: EtfListRow[] = [];
  for (const r of [...byName, ...byHolding]) {
    if (seen.has(r.code)) continue;
    seen.add(r.code);
    merged.push(r);
  }
  return merged;
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

// 비교용: 여러 종목의 상세 묶음을 한 번에.
// 종목별 Promise를 캐시해 비교 목록 변경 시 이미 받은 종목은 재요청하지 않음(EOD 데이터라 세션 내 안정).
const _bundleCache = new Map<string, Promise<DetailBundle>>();
export function fetchCompareData(codes: string[]): Promise<DetailBundle[]> {
  return Promise.all(
    codes.map((code) => {
      let p = _bundleCache.get(code);
      if (!p) {
        p = fetchDetailBundle(code);
        _bundleCache.set(code, p);
      }
      return p;
    }),
  );
}

// ── 심화 분석: 동종 그룹(기초지수 우선, 없으면 카테고리) 내 상대 위치 산출 ──
export interface PeerMetric {
  key: string;
  label: string;
  value: number;
  rank: number; // 1 = best (총보수·추적오차는 낮을수록, 분배수익률은 높을수록)
  total: number;
  min: number;
  max: number;
  better: 'low' | 'high';
}
export interface PeerComparison {
  groupLabel: string;
  count: number;
  metrics: PeerMetric[];
}

interface PeerMetaRow {
  code: string;
  fee_pct: number | null;
}
interface PeerDetailRow {
  code: string;
  dividend_yield: number | null;
  chase_error_rate: number | null;
}

export async function fetchPeerComparison(
  meta: EtfMeta,
  detail: EtfDetail | null,
): Promise<PeerComparison | null> {
  const market = meta.market;
  let groupLabel = '';
  let peers: PeerMetaRow[] = [];

  // 1순위: 같은 기초지수 (3개 이상일 때만)
  if (meta.base_index) {
    const enc = encodeURIComponent(meta.base_index);
    peers = await selectFrom(
      'etf_meta',
      `select=code,fee_pct&base_index=eq.${enc}&market=eq.${market}&limit=500`,
    );
    if (peers.length >= 3) groupLabel = meta.base_index;
  }
  // 폴백: 같은 카테고리
  if (!groupLabel) {
    if (!meta.category) return null;
    const enc = encodeURIComponent(meta.category);
    peers = await selectFrom(
      'etf_meta',
      `select=code,fee_pct&category=eq.${enc}&market=eq.${market}&limit=500`,
    );
    if (peers.length < 3) return null;
    groupLabel = meta.category;
  }

  const codes = peers.map((p) => p.code);
  const inList = `(${codes.map(encodeURIComponent).join(',')})`;
  const details: PeerDetailRow[] = await selectFrom(
    'etf_detail',
    `select=code,dividend_yield,chase_error_rate&code=in.${inList}&limit=500`,
  );
  const dmap = new Map(details.map((d) => [d.code, d]));

  const feeVals = peers.map((p) => p.fee_pct).filter((v): v is number => v != null);
  const yieldVals = peers
    .map((p) => dmap.get(p.code)?.dividend_yield)
    .filter((v): v is number => v != null);
  const trackVals = peers
    .map((p) => dmap.get(p.code)?.chase_error_rate)
    .filter((v): v is number => v != null);

  const metrics: PeerMetric[] = [];
  const add = (
    key: string,
    label: string,
    value: number | null,
    vals: number[],
    better: 'low' | 'high',
  ) => {
    if (value == null || vals.length < 3) return;
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const rank =
      better === 'low'
        ? vals.filter((v) => v < value).length + 1
        : vals.filter((v) => v > value).length + 1;
    metrics.push({ key, label, value, rank, total: vals.length, min, max, better });
  };

  add('fee', '총보수', meta.fee_pct, feeVals, 'low');
  add('yield', '분배수익률', detail?.dividend_yield ?? null, yieldVals, 'high');
  if (market === 'KR') add('track', '추적오차', detail?.chase_error_rate ?? null, trackVals, 'low');

  if (metrics.length === 0) return null;
  return { groupLabel, count: peers.length, metrics };
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
