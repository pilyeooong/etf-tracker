"""일배치 진입점. 네이버에서 ETF EOD + 상세 수집 → Supabase upsert.

Stage 1: etfItemList → etf_meta + etf_daily_quote (전 종목 1콜)
Stage 2: etfAnalysis(종목별) → etf_meta 보강 + etf_risk + etf_detail + etf_holding

환경변수: SUPABASE_URL, SUPABASE_SERVICE_KEY (crawler/.env 자동 로드)
옵션: FORCE=1(주말 무시), DRY=1(수집만), DETAIL_LIMIT=N(상세 N개만), NO_DETAIL=1(stage2 생략)
"""
from __future__ import annotations

import os
import sys
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import naver
import naver_detail
import naver_us
import supabase_io
import us_universe
import yahoo

KST = ZoneInfo("Asia/Seoul")
WORKERS = 8


def _load_env() -> None:
    """crawler/.env 를 환경변수로 로드(이미 설정된 값은 보존)."""
    env = Path(__file__).with_name(".env")
    if not env.exists():
        return
    for line in env.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip())


def main() -> int:
    _load_env()
    now = datetime.now(KST)
    trade_date = now.date().isoformat()
    force = os.environ.get("FORCE") == "1"
    dry = os.environ.get("DRY") == "1"
    no_detail = os.environ.get("NO_DETAIL") == "1"
    detail_limit = int(os.environ.get("DETAIL_LIMIT", "0"))

    if now.weekday() >= 5 and not force:
        print(f"[skip] 주말({trade_date}) — 거래일 아님. FORCE=1로 강제 실행 가능.")
        return 0

    # ── Stage 1: 전 종목 시세 ──
    print(f"[stage1] 시세 수집 trade_date={trade_date}")
    items = naver.fetch_etf_list()
    metas, quotes = naver.parse_quotes(items, trade_date)
    print(f"[stage1] {len(quotes)}종목")

    if dry:
        print("[dry] 적재 생략. meta:", metas[0], "\n        quote:", quotes[0])
        return 0

    print("[stage1] etf_meta:", supabase_io.upsert("etf_meta", metas, "code"))
    print("[stage1] etf_daily_quote:", supabase_io.upsert("etf_daily_quote", quotes, "code,date"))

    # ── Stage 2: KR 종목별 상세 ──
    if not no_detail:
        codes = [m["code"] for m in metas]
        if detail_limit:
            codes = codes[:detail_limit]
        print(f"[stage2] 상세 수집 {len(codes)}종목 (workers={WORKERS})")

        name_by_code = {m["code"]: m["name"] for m in metas}
        meta_patch, risks, details, holdings = [], [], [], []

        with ThreadPoolExecutor(max_workers=WORKERS) as ex:
            for res in ex.map(lambda c: naver_detail.fetch_detail(c, trade_date), codes):
                if not res:
                    continue
                m = res["meta"]
                # 키 고정(벌크 upsert는 모든 행 키 동일 + name NOT NULL). issuer는 stage1 값 보존.
                meta_patch.append(
                    {
                        "code": m["code"],
                        "name": name_by_code.get(m["code"], m["code"]),
                        "base_index": m["base_index"],
                        "fee_pct": m["fee_pct"],
                        "tax_category": m["tax_category"],
                        "listing_date": m["listing_date"],
                    }
                )
                risks.append(res["risk"])
                details.append(res["detail"])
                holdings.extend(res["holdings"])

        print(f"[stage2] 성공 {len(details)}/{len(codes)}, 구성종목 {len(holdings)}행")
        supabase_io.upsert("etf_meta", meta_patch, "code")
        supabase_io.upsert("etf_risk", risks, "code")
        supabase_io.upsert("etf_detail", details, "code")
        supabase_io.delete_all("etf_holding")
        supabase_io.upsert("etf_holding", holdings, "code,stock_code,stock_name")
        print("[stage2] 적재 완료")
    else:
        print("[stage2] 생략")

    # ── Stage 3: 미국 상장 ETF (큐레이션) ──
    if os.environ.get("NO_US") != "1":
        tickers = us_universe.US_ETFS
        print(f"[stage3] 미국 ETF 시세 수집 {len(tickers)}종목 (workers={WORKERS})")
        us_metas, us_quotes, us_details = [], [], []
        with ThreadPoolExecutor(max_workers=WORKERS) as ex:
            for res in ex.map(lambda tc: naver_us.fetch_us(tc[0], tc[1], trade_date), tickers):
                if not res:
                    continue
                us_metas.append(res["meta"])
                us_quotes.append(res["quote"])
                us_details.append(res["detail"])
        print(f"[stage3] 네이버 시세 {len(us_quotes)}/{len(tickers)}")

        # Yahoo 보강: 구성종목·섹터·보수 (비공식 API라 저동시성 + graceful skip)
        us_holdings = []
        if os.environ.get("NO_YAHOO") != "1" and us_metas:
            meta_by = {m["code"]: m for m in us_metas}
            detail_by = {d["code"]: d for d in us_details}
            us_codes = list(meta_by.keys())
            print(f"[stage3] Yahoo 보강 {len(us_codes)}종목 (workers=3)")
            ok = 0
            with ThreadPoolExecutor(max_workers=3) as ex:
                for code, y in zip(us_codes, ex.map(lambda c: yahoo.fetch_holdings(c, trade_date), us_codes)):
                    if not y:
                        continue
                    ok += 1
                    us_holdings.extend(y["holdings"])
                    if y["sectors"]:
                        detail_by[code]["sector_portfolio"] = y["sectors"]
                    if y["fee_pct"] is not None:
                        meta_by[code]["fee_pct"] = y["fee_pct"]
            print(f"[stage3] Yahoo {ok}/{len(us_codes)}, 구성종목 {len(us_holdings)}행")

        supabase_io.upsert("etf_meta", us_metas, "code")
        supabase_io.upsert("etf_daily_quote", us_quotes, "code,date")
        supabase_io.upsert("etf_detail", us_details, "code")
        if us_holdings:
            us_codes = [m["code"] for m in us_metas]
            supabase_io.delete_in("etf_holding", "code", us_codes)
            supabase_io.upsert("etf_holding", us_holdings, "code,stock_code,stock_name")
        print("[stage3] 적재 완료")

    print("[done]")
    return 0


if __name__ == "__main__":
    sys.exit(main())
