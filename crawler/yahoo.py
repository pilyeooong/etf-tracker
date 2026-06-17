"""Yahoo Finance quoteSummary로 미국 ETF 구성종목·섹터·보수를 보강 수집.

비공식 API라 cookie + crumb 핸드셰이크가 필요하고 레이트리밋에 취약하다.
실패 시 None을 반환해 상위에서 graceful skip 한다(가격·배당은 네이버가 이미 채움).
"""
from __future__ import annotations

import time

import requests

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36"
)
QS_URL = "https://query2.finance.yahoo.com/v10/finance/quoteSummary/{ticker}"
CRUMB_URL = "https://query2.finance.yahoo.com/v1/test/getcrumb"

# Yahoo 섹터 키 → 한글 라벨
SECTOR_KR = {
    "technology": "IT",
    "financial_services": "금융",
    "healthcare": "헬스케어",
    "consumer_cyclical": "경기소비재",
    "consumer_defensive": "필수소비재",
    "communication_services": "커뮤니케이션",
    "industrials": "산업재",
    "energy": "에너지",
    "basic_materials": "소재",
    "utilities": "유틸리티",
    "realestate": "부동산",
}

_session = requests.Session()
_session.headers.update({"User-Agent": UA})
_crumb: str | None = None


def _get_crumb() -> str | None:
    global _crumb
    if _crumb:
        return _crumb
    for attempt in range(4):
        try:
            _session.get("https://fc.yahoo.com", timeout=15)
            r = _session.get(CRUMB_URL, headers={"Accept": "text/plain"}, timeout=15)
            if r.status_code == 200 and r.text and "{" not in r.text and "Too Many" not in r.text:
                _crumb = r.text.strip()
                return _crumb
        except Exception:  # noqa: BLE001
            pass
        time.sleep(2 * (attempt + 1))
    return None


def _pct(node) -> float | None:
    if isinstance(node, dict) and node.get("raw") is not None:
        return round(node["raw"] * 100, 4)
    return None


def fetch_holdings(ticker: str, as_of: str) -> dict | None:
    """{holdings, sectors, fee_pct} 반환. 실패 시 None."""
    crumb = _get_crumb()
    if not crumb:
        return None

    data = None
    for attempt in range(4):
        try:
            r = _session.get(
                QS_URL.format(ticker=ticker),
                params={"modules": "topHoldings,fundProfile", "crumb": crumb},
                timeout=15,
            )
            if r.status_code == 200:
                data = r.json()
                break
            if r.status_code in (401, 403):
                # crumb 만료 → 갱신 후 재시도
                global _crumb
                _crumb = None
                crumb = _get_crumb()
                if not crumb:
                    return None
            if r.status_code == 404:
                return None
        except Exception:  # noqa: BLE001
            pass
        time.sleep(1.5 * (attempt + 1))
    if not data:
        return None

    try:
        res = data["quoteSummary"]["result"][0]
    except (KeyError, IndexError, TypeError):
        return None
    th = res.get("topHoldings") or {}

    holdings = []
    for i, h in enumerate(th.get("holdings") or []):
        nm = (h.get("holdingName") or "").strip()
        if not nm:
            continue
        holdings.append(
            {
                "code": ticker,
                "stock_code": (h.get("symbol") or "").strip(),
                "stock_name": nm,
                "weight": _pct(h.get("holdingPercent")),
                "seq": i + 1,
                "as_of": as_of,
            }
        )

    sectors = []
    for sw in th.get("sectorWeightings") or []:
        # {sector_key: {raw,fmt}} 형태
        for key, val in sw.items():
            sectors.append({"code": SECTOR_KR.get(key, key), "weight": _pct(val)})

    fee = (
        res.get("fundProfile", {})
        .get("feesExpensesInvestment", {})
        .get("annualReportExpenseRatio")
    )
    fee_pct = _pct(fee)

    return {"holdings": holdings, "sectors": sectors, "fee_pct": fee_pct}


if __name__ == "__main__":
    import json

    print(json.dumps(fetch_holdings("SPY", "2026-06-17"), ensure_ascii=False, indent=2)[:1000])
