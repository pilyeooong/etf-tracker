"""네이버 m.stock etfAnalysis 엔드포인트로 ETF 상세를 수집.

코드당 1콜로 메타 보강(운용사/기초지수/총보수/세금/상장일) + 기간수익률 +
섹터/자산/국가 비중 + top10 구성종목 + 분배금 + 괴리율/추적오차를 얻는다.
"""
from __future__ import annotations

import requests

ANALYSIS_URL = "https://m.stock.naver.com/api/stock/{code}/etfAnalysis"

# taxationTypeCode → 라벨
TAX_LABEL = {
    "1": "국내 주식형 (매매차익 비과세)",
    "2": "기타 (배당소득세 15.4%)",
    "3": "기타 (배당소득세 15.4%)",
}

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
    if s in ("", "-", "N/A"):
        return None
    try:
        return float(s)
    except ValueError:
        return None


def _date(v) -> str | None:
    s = str(v or "").strip()
    if len(s) == 8 and s.isdigit():
        return f"{s[:4]}-{s[4:6]}-{s[6:]}"
    return None


def fetch_detail(code: str, as_of: str) -> dict | None:
    """code의 상세를 파싱해 {meta, risk, detail, holdings}로 반환. 실패 시 None."""
    try:
        r = _session.get(ANALYSIS_URL.format(code=code), timeout=15)
        if r.status_code != 200 or not r.text.startswith("{"):
            return None
        d = r.json()
    except Exception:  # noqa: BLE001
        return None

    if not d.get("itemCode"):
        return None

    # 기간수익률: periodTypeCode → value
    ret = {p.get("periodTypeCode"): _num(p.get("value")) for p in d.get("returnPerformanceList") or []}

    meta = {
        "code": code,
        "issuer": d.get("issuerName"),
        "base_index": d.get("etfBaseIndex"),
        "fee_pct": _num(d.get("totalFee")),
        "tax_category": TAX_LABEL.get(str(d.get("taxationTypeCode"))),
        "listing_date": _date(d.get("listedDate")),
    }

    risk = {
        "code": code,
        "as_of": as_of,
        "return_1m": ret.get("M1"),
        "return_3m": ret.get("M3"),
        "return_6m": ret.get("M6"),
        "return_1y": ret.get("Y1"),
    }

    def _portfolio(key):
        return [
            {"code": x.get("detailTypeCode"), "weight": _num(x.get("weight"))}
            for x in d.get(key) or []
        ]

    div = d.get("dividend") or {}
    detail = {
        "code": code,
        "nav": _num(d.get("nav")),
        "deviation_rate": _num(d.get("deviationRate")),
        "chase_error_rate": _num(d.get("chaseErrorRate")),
        "dividend_yield": _num(div.get("dividendYieldTtm")),
        "dividend_per_share": _num(div.get("dividendPerShareTtm")),
        "dividend_count_year": div.get("dividendCountThisYear"),
        "dividend_months": div.get("dividendMonthThisYear"),
        "net_inflow": d.get("cumulativeNetInflowList"),
        "summary": d.get("etfSummary"),
        "returns": [{"period": k, "value": v} for k, v in ret.items()],
        "sector_portfolio": _portfolio("sectorPortfolioList"),
        "asset_portfolio": _portfolio("assetPortfolioList"),
        "country_portfolio": _portfolio("countryPortfolioList"),
    }

    holdings = []
    for h in d.get("etfTop10MajorConstituentAssets") or []:
        nm = (h.get("itemName") or "").strip()
        if not nm:
            continue
        holdings.append(
            {
                "code": code,
                "stock_code": (h.get("itemCode") or "").strip(),
                "stock_name": nm,
                "weight": _num(h.get("etfWeight")),
                "seq": h.get("seq"),
                "as_of": as_of,
            }
        )

    return {"meta": meta, "risk": risk, "detail": detail, "holdings": holdings}


if __name__ == "__main__":
    import json

    print(json.dumps(fetch_detail("069500", "2026-06-17"), ensure_ascii=False, indent=2)[:1200])
