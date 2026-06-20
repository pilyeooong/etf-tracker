# ETF나우 (etf-insight)

국내 상장 ETF의 **일별(EOD) 종가·기준가(NAV)·괴리율·구성종목·섹터/수익률**을 보여주는 앱인토스 미니앱.
실시간은 포기하고 **크롤링 → Supabase 저장 → 서빙** 구조 (전부 무료 티어).

```
GitHub Actions (평일 18:30 KST, cron)
  └ crawler/  파이썬 일배치
       ├ stage1: 네이버 etfItemList → 국내 전 종목 시세 (1콜)
       ├ stage2: 네이버 etfAnalysis(종목별) → 메타·수익률·섹터·TOP10·분배·괴리/추적오차
       └ stage3: 네이버 해외 basic(큐레이션 ~110종목) → 미국 상장 ETF 시세·배당
Supabase (free)
  ├ Postgres   : etf_meta / etf_daily_quote / etf_detail / etf_risk / etf_holding / etf_dividend / etf_index_daily
  └ PostgREST  : 프론트가 anon 키로 읽기 (RLS: public read)
frontend/  Granite(Vite+React+TS) + TDS : 홈/검색/상세 3개 화면
```

## 폴더 구조

```
etf-insight/
├─ frontend/
│  └─ src/
│     ├─ lib/        supabase.ts(PostgREST 클라) · queries.ts(쿼리) · format.ts
│     ├─ hooks/      useAsync.ts
│     ├─ components/ ListRow.tsx · BottomNav.tsx
│     ├─ pages/      HomePage(거래량/상승/하락) · SearchPage(검색·역검색·칩) · DetailPage(상세)
│     └─ App.tsx     HashRouter
├─ crawler/
│  ├─ naver.py         전종목 시세 + 태그 파생
│  ├─ naver_detail.py  종목별 상세(etfAnalysis)
│  ├─ supabase_io.py   PostgREST upsert/delete (service_role)
│  └─ run.py           진입점(stage1 + stage2, .env 자동 로드)
├─ supabase/schema.sql
└─ .github/workflows/crawl.yml
```

## 기능

- **홈**: 🇰🇷국내 / 🇺🇸미국 토글 + 거래량/상승/하락 TOP 30 (KR=종가·등락·괴리율, US=$시세·등락)
- **검색**: ETF 이름 검색 + **종목 역검색**(예: "삼성전자" → 그 종목 담은 ETF) + 테마/유형 칩. KR·US 이름 교차 검색.
- **상세**:
  - KR: 가격·괴리율·추적오차, 총보수·분배수익률·시총·상장일·과세유형, 기간 수익률(1·3·6·12M), 구성종목 TOP10 비중바, 섹터 비중, 상품 설명
  - US: $시세·등락, 분배수익률·주당분배금·시총·거래량, 구성종목 TOP10·섹터 비중(stockanalysis) (괴리율/NAV는 미제공 — 미국 ETF는 괴리율이 무의미)
  - 심화 분석(리워드 광고 후): 동종 그룹 내 비용·분배수익률·추적오차 순위, 구성 집중도, 분배 캘린더(지급 월·횟수, KR), 자금 흐름(순유입 1주/1개월/3개월 + 유입/유출세, KR). 모두 보유 데이터로 산출하는 객관 통계

## 데이터 소스

- **네이버 금융** (로그인·OTP 불필요)
  - `etfItemList.nhn` — 국내 전 종목(~1,140) 현재가/NAV/등락/거래량/시총/분류 (1콜)
  - `m.stock.naver.com/api/stock/{code}/etfAnalysis` — 국내 종목별 상세
  - `api.stock.naver.com/stock/{ticker}/basic` — 미국 ETF 시세·시총·배당 (티커별; reuters 접미사 `.O`/`.K`/bare 자동 탐색)
- **stockanalysis.com** `/api/symbol/e/{ticker}/holdings` — 미국 ETF 구성종목 TOP10·섹터 비중 보강 (`crawler/stockanalysis.py`). 키 불필요·데이터센터 IP 친화적(Yahoo는 클라우드 IP를 차단해 GH Actions에서 0건이라 교체). 실패 시 graceful skip. `NO_HOLDINGS=1`로 생략 가능.
- 미국 큐레이션 목록: `crawler/us_universe.py` (한국인 인기 ~110종목). 미국은 전종목 일괄 엔드포인트가 없음.
- KRX 정보데이터시스템은 ETF 전종목 시세가 **로그인 게이트**라 미사용.
- 단위: KR `trading_value`=백만원·`market_cap`=억원 / US `trading_value`·`market_cap`=억 USD.

## 셋업

### 1) Supabase
- 이 레포의 미니앱들은 **하나의 공유 Supabase 프로젝트**를 테이블 접두사로 공유. `supabase/schema.sql`을 SQL Editor에서 실행하면 `etf_*` 테이블이 생성됨.

### 2) 크롤러
```bash
cd crawler
pip install -r requirements.txt
cp .env.example .env          # SUPABASE_URL / SUPABASE_SERVICE_KEY (service_role)
DETAIL_LIMIT=5 python run.py  # 소규모 검증
python run.py                 # 전체(시세 + 1,140종목 상세, ~수 분)
```
옵션: `FORCE=1`(주말 무시) · `DRY=1`(stage1만, 미적재) · `NO_DETAIL=1`(시세만) · `DETAIL_LIMIT=N`

### 3) GitHub Actions
1. 이 폴더를 **독립 레포**로 push (public이면 Actions 무제한 무료)
2. Settings > Secrets > Actions: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
3. 평일 18:30 KST 자동 실행 (+ 수동 실행 dispatch). 60일 무커밋 시 깃헙이 cron 비활성화하니 주기적 커밋.

### 4) 프론트엔드
```bash
cd frontend
npm install --legacy-peer-deps   # React 19 + TDS peer 충돌 회피
cp .env.example .env             # VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
npm run dev                      # granite dev
npm run build                    # tsc -b && vite build
```

## 한계 / 메모

- 네이버 list엔 거래일 파라미터가 없어 **호출 시점 KST 거래일로 스탬프**(cron 평일 장 마감 후 전제). 공휴일 가드 없음.
- 괴리율 = **종가 vs 공식 NAV**(둘 다 확정값). 장중 추정 iNAV는 다루지 않음.
- 구성종목은 네이버 제공 **TOP10**만(해외 ETF는 비중 미제공). 전체 PDF·비중 변동 추적은 미구현.
- 위험지표(`etf_risk`)는 네이버 기간수익률만 적재. MDD/Sharpe 등은 `etf_daily_quote` 시계열이 쌓이면 추가 계산 예정.
- `etf_holding`은 매일 스냅샷 전체 교체(현재 보유분만 유지, ~11k행 유한).
