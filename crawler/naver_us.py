"""네이버 해외주식 API로 미국 상장 ETF 데이터 수집.

api.stock.naver.com/stock/{ticker}/basic 한 콜로 시세/시총/거래량/배당을 얻는다.
미국 ETF는 NAV/괴리율/구성종목/보수를 제공하지 않으므로 가격·배당 중심으로 적재한다.
"""
from __future__ import annotations

import time

import requests

BASIC_URL = "https://api.stock.naver.com/stock/{ticker}/basic"
# 네이버 reuters 코드 접미사: bare(일부 NYSE) / .O(NASDAQ) / .K(NYSE Arca·Cboe) / .N / .P
SUFFIXES = ["", ".O", ".K", ".N", ".P"]

_session = requests.Session()
_session.headers.update(
    {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        "Referer": "https://m.stock.naver.com/",
    }
)


def _num(v):
    if v is None:
        return None
    s = str(v).strip().replace(",", "").replace("%", "")
    # "504억 USD" / "7,920억 USD" → 억 단위 숫자
    if "억" in s:
        s = s.split("억")[0].replace(",", "").strip()
    s = s.replace("USD", "").strip()
    if s in ("", "-", "N/A"):
        return None
    try:
        return float(s)
    except ValueError:
        return None


def _int(v):
    n = _num(v)
    return int(n) if n is not None else None


def _info(d: dict, code: str):
    for it in d.get("stockItemTotalInfos", []) or []:
        if it.get("code") == code:
            return it.get("value")
    return None


def _fetch_basic(ticker: str) -> dict | None:
    """접미사를 순차 시도해 ETF 마스터를 찾는다. code는 깨끗한 ticker로 저장."""
    for suf in SUFFIXES:
        for attempt in range(2):
            try:
                r = _session.get(BASIC_URL.format(ticker=ticker + suf), timeout=15)
                if r.status_code == 200:
                    d = r.json()
                    if d.get("isEtf"):
                        return d
                    break  # 200이지만 ETF 아님 → 다음 접미사 불필요
                if r.status_code in (404, 409):
                    break  # 이 접미사엔 없음 → 다음 접미사
            except Exception:  # noqa: BLE001
                time.sleep(0.5)
    return None


def fetch_us(ticker: str, category: str, as_of: str) -> dict | None:
    """{meta, quote, detail} 반환. 실패/비ETF면 None."""
    d = _fetch_basic(ticker)
    if d is None:
        return None

    if not d.get("isEtf"):
        return None

    name = (d.get("stockName") or ticker).strip()
    close = _num(d.get("closePrice"))
    change_pct = _num(d.get("fluctuationsRatio"))

    meta = {
        "code": ticker,
        "name": name,
        "market": "US",
        "currency": "USD",
        "category": category,
        "issuer": None,
        "fee_pct": None,  # Yahoo 보강에서 채움(없으면 null). 배치 키 균일 위해 항상 포함.
    }
    quote = {
        "code": ticker,
        "date": as_of,
        "close": close,
        "change_pct": change_pct,
        "volume": _int(_info(d, "accumulatedTradingVolume")),
        "trading_value": _int(_info(d, "accumulatedTradingValue")),  # 억 USD
        "nav": None,
        "premium_pct": None,
        "market_cap": _num(_info(d, "marketValue")),  # 억 USD
        "net_assets": None,
    }
    detail = {
        "code": ticker,
        "nav": None,
        "deviation_rate": None,
        "chase_error_rate": None,
        "dividend_yield": _num(_info(d, "dividendYieldRatio")),
        "dividend_per_share": _num(_info(d, "dividend")),
        "summary": None,
        "returns": [],
        "sector_portfolio": [],
        "asset_portfolio": [],
        "country_portfolio": [],
    }
    return {"meta": meta, "quote": quote, "detail": detail}


if __name__ == "__main__":
    import json

    print(json.dumps(fetch_us("SPY", "미국 시장지수", "2026-06-17"), ensure_ascii=False, indent=2))
