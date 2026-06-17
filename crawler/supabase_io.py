"""Supabase(PostgREST)로 upsert. service_role 키 사용(RLS 우회)."""
from __future__ import annotations

import os

import requests

CHUNK = 500


def _config() -> tuple[str, str]:
    url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    key = os.environ.get("SUPABASE_SERVICE_KEY", "")
    if not url or not key:
        raise RuntimeError("환경변수 SUPABASE_URL / SUPABASE_SERVICE_KEY 필요")
    return url, key


def upsert(table: str, rows: list[dict], on_conflict: str) -> int:
    """rows를 table에 upsert. 반환: 적재 행 수."""
    if not rows:
        return 0
    url, key = _config()
    endpoint = f"{url}/rest/v1/{table}?on_conflict={on_conflict}"
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }
    total = 0
    for i in range(0, len(rows), CHUNK):
        batch = rows[i : i + CHUNK]
        r = requests.post(endpoint, headers=headers, json=batch, timeout=60)
        if r.status_code >= 300:
            raise RuntimeError(
                f"upsert 실패 table={table} status={r.status_code}: {r.text[:300]}"
            )
        total += len(batch)
    return total


def delete_all(table: str) -> None:
    """스냅샷 테이블 전체 삭제(재적재 전). code IS NOT NULL 필터로 전 행 매칭."""
    url, key = _config()
    endpoint = f"{url}/rest/v1/{table}?code=not.is.null"
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Prefer": "return=minimal",
    }
    r = requests.delete(endpoint, headers=headers, timeout=60)
    if r.status_code >= 300:
        raise RuntimeError(f"delete 실패 table={table} status={r.status_code}: {r.text[:200]}")


def delete_in(table: str, column: str, values: list[str]) -> None:
    """column IN (values) 인 행 삭제. (예: 미국 종목 holdings 재적재 전)"""
    if not values:
        return
    url, key = _config()
    headers = {"apikey": key, "Authorization": f"Bearer {key}", "Prefer": "return=minimal"}
    for i in range(0, len(values), CHUNK):
        batch = values[i : i + CHUNK]
        in_list = "(" + ",".join(batch) + ")"
        endpoint = f"{url}/rest/v1/{table}?{column}=in.{in_list}"
        r = requests.delete(endpoint, headers=headers, timeout=60)
        if r.status_code >= 300:
            raise RuntimeError(
                f"delete_in 실패 table={table} status={r.status_code}: {r.text[:200]}"
            )
