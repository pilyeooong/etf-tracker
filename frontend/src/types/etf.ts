export type Market = 'KR' | 'US';

export interface EtfMeta {
  code: string;
  name: string;
  issuer: string | null;
  base_index: string | null;
  fee_pct: number | null;
  tax_category: string | null;
  listing_date: string | null;
  category: string | null;
  tags: string[];
  market: Market;
  currency: string;
}

export interface EtfQuote {
  code: string;
  date: string;
  close: number | null;
  change_pct: number | null;
  volume: number | null;
  trading_value: number | null; // 백만원
  nav: number | null;
  premium_pct: number | null;
  market_cap: number | null; // 억원
  net_assets: number | null;
}

export interface PortfolioSlice {
  code: string;
  weight: number | null;
}

export interface PeriodReturn {
  period: string; // D1/W1/M1/M3/M6/YTD/Y1/Y3/Y5
  value: number | null;
}

export interface EtfDetail {
  code: string;
  nav: number | null;
  deviation_rate: number | null;
  chase_error_rate: number | null;
  dividend_yield: number | null;
  dividend_per_share: number | null;
  summary: string | null;
  returns: PeriodReturn[];
  sector_portfolio: PortfolioSlice[];
  asset_portfolio: PortfolioSlice[];
  country_portfolio: PortfolioSlice[];
}

export interface EtfRisk {
  code: string;
  as_of: string;
  return_1m: number | null;
  return_3m: number | null;
  return_6m: number | null;
  return_1y: number | null;
}

export interface EtfHolding {
  code: string;
  stock_code: string;
  stock_name: string;
  weight: number | null;
  seq: number | null;
}

// 목록 행 (etf_daily_quote + 임베디드 메타)
export interface EtfListRow {
  code: string;
  date: string;
  close: number | null;
  change_pct: number | null;
  premium_pct: number | null;
  volume: number | null;
  etf_meta: {
    name: string;
    category: string | null;
    tags: string[];
    market: Market;
    currency: string;
  } | null;
}
