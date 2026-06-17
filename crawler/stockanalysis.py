"""stockanalysis.com으로 미국 ETF 구성종목·섹터를 보강 수집.

키 불필요·데이터센터 IP 친화적(Yahoo는 클라우드 IP를 차단해 GH Actions에서 0건).
실패 시 None을 반환해 graceful skip(가격·배당은 네이버가 이미 채움).
"""
from __future__ import annotations

import time

import requests

HOLDINGS_URL = "https://stockanalysis.com/api/symbol/e/{ticker}/holdings"
TOP_N = 10

# 영문 섹터명 → 한글
SECTOR_KR = {
    "Technology": "IT",
    "Information Technology": "IT",
    "Financials": "금융",
    "Financial Services": "금융",
    "Communication Services": "커뮤니케이션",
    "Consumer Discretionary": "경기소비재",
    "Consumer Cyclical": "경기소비재",
    "Healthcare": "헬스케어",
    "Health Care": "헬스케어",
    "Industrials": "산업재",
    "Consumer Staples": "필수소비재",
    "Consumer Defensive": "필수소비재",
    "Energy": "에너지",
    "Utilities": "유틸리티",
    "Real Estate": "부동산",
    "Materials": "소재",
    "Basic Materials": "소재",
}

_session = requests.Session()
_session.headers.update(
    {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36",
        "Referer": "https://stockanalysis.com/",
    }
)


def _pct(v) -> float | None:
    if v is None:
        return None
    s = str(v).strip().replace("%", "").replace(",", "")
    if s in ("", "-", "N/A"):
        return None
    try:
        return float(s)
    except ValueError:
        return None


def fetch_holdings(ticker: str, as_of: str) -> dict | None:
    """{holdings, sectors, fee_pct} 반환. 실패 시 None."""
    data = None
    for attempt in range(3):
        try:
            r = _session.get(HOLDINGS_URL.format(ticker=ticker), timeout=15)
            if r.status_code == 200:
                j = r.json()
                if j.get("status") == 200 or j.get("data"):
                    data = j.get("data")
                    break
            if r.status_code == 404:
                return None
        except Exception:  # noqa: BLE001
            pass
        time.sleep(1.0 * (attempt + 1))
    if not data:
        return None

    holdings = []
    for h in (data.get("holdings") or [])[:TOP_N]:
        nm = (h.get("n") or "").strip()
        if not nm:
            continue
        sym = (h.get("s") or "").lstrip("$").strip()
        holdings.append(
            {
                "code": ticker,
                "stock_code": sym,
                "stock_name": nm,
                "weight": _pct(h.get("as")),
                "seq": h.get("no"),
                "as_of": as_of,
            }
        )

    sectors = [
        {"code": SECTOR_KR.get(s.get("n"), s.get("n")), "weight": _pct(s.get("w"))}
        for s in (data.get("sectors") or [])
        if s.get("n")
    ]

    return {"holdings": holdings, "sectors": sectors, "fee_pct": None}


if __name__ == "__main__":
    import json

    print(json.dumps(fetch_holdings("SPY", "2026-06-17"), ensure_ascii=False, indent=2)[:900])
