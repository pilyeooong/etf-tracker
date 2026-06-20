-- ETF Tracker — Supabase schema
-- 무료 티어 기준. 일별(EOD) 데이터를 GitHub Actions 크롤러가 upsert, 프론트는 읽기만.
-- 적용: Supabase Studio > SQL Editor 에 붙여넣고 실행.

-- ─────────────────────────────────────────────
-- 1. ETF 메타 (거의 안 변함, 주1회 갱신)
-- ─────────────────────────────────────────────
create table if not exists etf_meta (
  code           text primary key,          -- KR=단축코드 '069500' / US=티커 'SPY'
  name           text not null,             -- 종목명
  issuer         text,                       -- 운용사
  base_index     text,                       -- 추적지수
  fee_pct        numeric,                    -- 총보수(%)
  tax_category   text,                       -- 과세유형
  listing_date   date,                       -- 상장일
  category       text,                       -- 분류/테마 — finder용
  tags           text[] default '{}',        -- 액티브/레버리지/인버스/배당/커버드콜
  market         text not null default 'KR', -- 'KR'(한국 상장) | 'US'(미국 상장)
  currency       text not null default 'KRW',-- 'KRW' | 'USD'
  updated_at     timestamptz default now()
);
create index if not exists idx_meta_market on etf_meta(market);

-- ─────────────────────────────────────────────
-- 2. 일별 시세 (배치 1일 1회) — 핵심
-- ─────────────────────────────────────────────
create table if not exists etf_daily_quote (
  code           text not null references etf_meta(code) on delete cascade,
  date           date not null,
  close          numeric,                    -- 종가
  change_pct     numeric,                    -- 전일대비 등락률(%)
  volume         bigint,                     -- 거래량
  trading_value  bigint,                     -- 거래대금
  nav            numeric,                    -- 공식 기준가(NAV)
  premium_pct    numeric,                    -- (close-nav)/nav*100, 적재 시 계산
  market_cap     numeric,                    -- 시가총액
  net_assets     numeric,                    -- 순자산총액(AUM)
  primary key (code, date)
);
create index if not exists idx_quote_date on etf_daily_quote(date);
create index if not exists idx_quote_code_date on etf_daily_quote(code, date desc);

-- ─────────────────────────────────────────────
-- 3. 구성종목 TOP10 — 현재 스냅샷(매일 전체 교체, 용량 유한)
-- ─────────────────────────────────────────────
create table if not exists etf_holding (
  code       text not null references etf_meta(code) on delete cascade,
  stock_code text not null,                  -- 빈 문자열 가능(해외종목)
  stock_name text not null,
  weight     numeric,                         -- 해외는 null 가능
  seq        int,                             -- top10 순번
  as_of      date,
  primary key (code, stock_code, stock_name)
);
create index if not exists idx_holding_stockname on etf_holding(stock_name);  -- 역검색
create index if not exists idx_holding_code on etf_holding(code);

-- ─────────────────────────────────────────────
-- 3-1. 상세(상세 페이지 구동, 코드당 최신 1행)
-- ─────────────────────────────────────────────
create table if not exists etf_detail (
  code               text primary key references etf_meta(code) on delete cascade,
  nav                numeric,
  deviation_rate     numeric,   -- 괴리율(%)
  chase_error_rate   numeric,   -- 추적오차(%)
  dividend_yield     numeric,   -- 분배수익률 TTM(%)
  dividend_per_share numeric,
  dividend_count_year integer,  -- 올해 분배 지급 횟수 (KR)
  dividend_months    text,      -- 올해 지급 월 "1,4,7,10" (KR)
  net_inflow         jsonb,     -- 순유입 흐름(cumulativeNetInflowList, KR만; US는 null)
  summary            text,
  returns            jsonb,     -- [{period,value}]
  sector_portfolio   jsonb,     -- [{code,weight}]
  asset_portfolio    jsonb,
  country_portfolio  jsonb,
  updated_at         timestamptz default now()
);
-- 기존 DB 호환(추가 전용): 위 컬럼이 없던 DB에도 안전하게 반영
alter table etf_detail
  add column if not exists dividend_count_year integer,
  add column if not exists dividend_months     text,
  add column if not exists net_inflow          jsonb;

-- ─────────────────────────────────────────────
-- 4. 분배금 (발생일에만)
-- ─────────────────────────────────────────────
create table if not exists etf_dividend (
  code     text not null references etf_meta(code) on delete cascade,
  ex_date  date not null,                     -- 분배락일
  pay_date date,
  amount   numeric,
  primary key (code, ex_date)
);

-- ─────────────────────────────────────────────
-- 5. 위험지표 (일배치 계산 결과 캐시 — close 시계열로 산출)
-- ─────────────────────────────────────────────
create table if not exists etf_risk (
  code         text primary key references etf_meta(code) on delete cascade,
  as_of        date not null,
  return_1m    numeric,
  return_3m    numeric,
  return_6m    numeric,
  return_1y    numeric,
  mdd_pct      numeric,                       -- 최대낙폭
  volatility   numeric,                       -- 연환산 변동성
  sharpe       numeric,
  sortino      numeric,
  calmar       numeric,
  updated_at   timestamptz default now()
);

-- ─────────────────────────────────────────────
-- 6. 지수 (홈/지수 페이지)
-- ─────────────────────────────────────────────
create table if not exists etf_index_daily (
  code        text not null,                  -- 'KOSPI' / 'KOSDAQ' / 'SP500' ...
  date        date not null,
  price       numeric,
  change_pct  numeric,
  primary key (code, date)
);

-- ─────────────────────────────────────────────
-- RLS: 프론트(anon)는 읽기 전용, 쓰기는 service_role(크롤러)만.
-- ─────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['etf_meta','etf_daily_quote','etf_holding','etf_detail','etf_dividend','etf_risk','etf_index_daily']
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists "public read %1$s" on %1$I;', t);
    execute format('create policy "public read %1$s" on %1$I for select using (true);', t);
  end loop;
end $$;
-- service_role 키는 RLS를 우회하므로 별도 INSERT/UPDATE 정책 불필요(크롤러는 service_role 사용).
