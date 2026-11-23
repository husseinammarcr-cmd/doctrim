"""First-party, privacy-first usage stats for DocTrim.

No cookies, no third-party script, no raw IP storage. A visitor is an HMAC of
(ip, user agent) keyed with a secret that changes every day, so uniques can be
counted but nobody can be followed across days — or across sites, because there
is no shared ID at all.

    POST /api/analytics/collect   browser -> JSON or text/plain, batched events
    GET  /api/analytics/summary   key-protected JSON
    GET  /stats?key=...           key-protected HTML dashboard

Storage is one SQLite file next to this module; 180-day retention.
"""
from __future__ import annotations

import hmac
import hashlib
import json
import os
import re
import secrets
import sqlite3
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse, Response

DB_PATH = Path(os.getenv("DOCTRIM_STATS_DB", Path(__file__).with_name("analytics.db")))
KEY_PATH = Path(__file__).with_name(".stats_key")
RETENTION_DAYS = 180

# Only these event names are stored; anything else is dropped, so a hostile
# client cannot turn the table into a dumping ground.
ALLOWED = {"pageview", "file_added", "run_start", "run_ok", "run_fail", "error", "download", "share"}
MAX_EVENTS = 20
MAX_STR = 200

router = APIRouter()


def _secret() -> str:
    env = os.getenv("DOCTRIM_STATS_KEY")
    if env:
        return env
    if KEY_PATH.exists():
        return KEY_PATH.read_text().strip()
    key = secrets.token_urlsafe(32)
    KEY_PATH.write_text(key)
    KEY_PATH.chmod(0o600)
    return key


def _db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, timeout=5)
    conn.row_factory = sqlite3.Row
    return conn


def init() -> None:
    conn = _db()
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS events (
            id      INTEGER PRIMARY KEY AUTOINCREMENT,
            ts      INTEGER NOT NULL,
            day     TEXT    NOT NULL,
            name    TEXT    NOT NULL,
            path    TEXT,
            tool    TEXT,
            value   INTEGER,
            msg     TEXT,
            ref     TEXT,
            visitor TEXT,
            device  TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_events_day ON events(day, name);
        CREATE INDEX IF NOT EXISTS idx_events_tool ON events(tool, name);
        """
    )
    conn.commit()
    conn.close()


def _clean(v, n=MAX_STR):
    if v is None:
        return None
    return str(v)[:n]


def _visitor(ip: str, ua: str, day: str) -> str:
    # rotates daily, so the same person is a new visitor tomorrow
    salt = f"{day}:{_secret()}"
    return hmac.new(salt.encode(), f"{ip}|{ua}".encode(), hashlib.sha256).hexdigest()[:32]


def _device(ua: str) -> str:
    if re.search(r"iPad|Tablet", ua):
        return "tablet"
    if re.search(r"Mobi|Android|iPhone", ua):
        return "mobile"
    return "desktop"


def _ref_host(request: Request) -> str | None:
    ref = request.headers.get("referer") or request.headers.get("origin") or ""
    m = re.match(r"https?://([^/]+)", ref)
    if not m:
        return None
    host = m.group(1).lower()
    return None if host.endswith("doctrim.pages.dev") else host


@router.post("/api/analytics/collect")
async def collect(request: Request):
    raw = await request.body()
    if len(raw) > 16_000:
        raise HTTPException(413, "payload too large")
    try:
        payload = json.loads(raw or b"{}")
    except ValueError:
        return Response(status_code=204)

    events = payload.get("e") if isinstance(payload, dict) else None
    if not isinstance(events, list) or not events:
        return Response(status_code=204)

    try:
        from limits import client_ip
    except Exception:  # pragma: no cover - the module always ships alongside
        def client_ip(req):
            return req.headers.get("x-forwarded-for", req.client.host if req.client else "").split(",")[0].strip()

    ip = client_ip(request)
    ua = request.headers.get("user-agent", "")
    now = int(time.time())
    day = datetime.fromtimestamp(now, timezone.utc).strftime("%Y-%m-%d")
    visitor = _visitor(ip, ua, day)
    device = _device(ua)
    ref = _ref_host(request)

    rows = []
    for ev in events[:MAX_EVENTS]:
        if not isinstance(ev, dict):
            continue
        name = ev.get("n")
        if name not in ALLOWED:
            continue
        value = ev.get("v")
        rows.append(
            (
                now,
                day,
                name,
                _clean(ev.get("p")),
                _clean(ev.get("t"), 60),
                int(value) if isinstance(value, (int, float)) else None,
                _clean(ev.get("m"), 300),
                _clean(ref, 100),
                visitor,
                device,
            )
        )
    if not rows:
        return Response(status_code=204)

    conn = _db()
    try:
        conn.executemany(
            "INSERT INTO events (ts, day, name, path, tool, value, msg, ref, visitor, device) VALUES (?,?,?,?,?,?,?,?,?,?)",
            rows,
        )
        # cheap retention sweep, roughly once every few hundred writes
        if secrets.randbelow(200) == 0:
            cutoff = (datetime.now(timezone.utc) - timedelta(days=RETENTION_DAYS)).strftime("%Y-%m-%d")
            conn.execute("DELETE FROM events WHERE day < ?", (cutoff,))
        conn.commit()
    finally:
        conn.close()
    return JSONResponse({"ok": True}, status_code=204)


def _require_key(request: Request) -> None:
    supplied = request.query_params.get("key") or request.headers.get("x-stats-key") or ""
    if not hmac.compare_digest(supplied, _secret()):
        raise HTTPException(401, "unauthorized")


def _summary(days: int) -> dict:
    start = (datetime.now(timezone.utc) - timedelta(days=days - 1)).strftime("%Y-%m-%d")
    conn = _db()
    try:
        q = lambda sql, *a: [dict(r) for r in conn.execute(sql, a).fetchall()]

        series = q(
            """SELECT day,
                      SUM(name='pageview')                        AS views,
                      COUNT(DISTINCT CASE WHEN name='pageview' THEN visitor END) AS visitors
               FROM events WHERE day >= ? GROUP BY day ORDER BY day""",
            start,
        )
        totals_row = q(
            """SELECT SUM(name='pageview') AS views,
                      COUNT(DISTINCT CASE WHEN name='pageview' THEN visitor END) AS visitors,
                      COUNT(DISTINCT CASE WHEN name IN ('run_ok','file_added') THEN visitor END) AS users_who_used
               FROM events WHERE day >= ?""",
            start,
        )[0]
        pages = q(
            "SELECT path, COUNT(*) n FROM events WHERE day >= ? AND name='pageview' GROUP BY path ORDER BY n DESC LIMIT 25",
            start,
        )
        tools = q(
            """SELECT tool,
                      SUM(name='file_added') AS added,
                      SUM(name='run_start')  AS started,
                      SUM(name='run_ok')     AS done,
                      SUM(name='run_fail')   AS failed,
                      SUM(name='download')   AS downloads,
                      ROUND(AVG(CASE WHEN name='run_ok' THEN value END)) AS avg_ms
               FROM events WHERE day >= ? AND tool IS NOT NULL GROUP BY tool ORDER BY started DESC, added DESC""",
            start,
        )
        names = q("SELECT name, COUNT(*) n FROM events WHERE day >= ? GROUP BY name ORDER BY n DESC", start)
        errors = q(
            "SELECT msg, COUNT(*) n FROM events WHERE day >= ? AND name IN ('error','run_fail') AND msg IS NOT NULL GROUP BY msg ORDER BY n DESC LIMIT 15",
            start,
        )
        refs = q(
            "SELECT ref, COUNT(*) n FROM events WHERE day >= ? AND name='pageview' AND ref IS NOT NULL GROUP BY ref ORDER BY n DESC LIMIT 15",
            start,
        )
        devices = q("SELECT device, COUNT(DISTINCT visitor) n FROM events WHERE day >= ? GROUP BY device", start)
        first = q("SELECT MIN(day) d FROM events")
    finally:
        conn.close()

    return {
        "days": days,
        "totals": totals_row,
        "first_day": first[0]["d"] if first else None,
        "series": series,
        "pages": pages,
        "tools": tools,
        "events": names,
        "errors": errors,
        "referrers": refs,
        "devices": {d["device"]: d["n"] for d in devices},
    }


@router.get("/api/analytics/summary")
async def summary(request: Request, days: int = 7):
    _require_key(request)
    return JSONResponse(_summary(max(1, min(days, 90))))


def _bar(value: int, max_value: int, width: int = 120) -> str:
    pct = 0 if not max_value else max(2, round(value * width / max_value))
    return f'<span class="bar" style="width:{pct}px"></span>'


def _table(headers, rows, widths=None) -> str:
    if not rows:
        return '<p class="empty">No data yet.</p>'
    th = "".join(
        f'<th style="width:{widths[i]}">{h}</th>' if widths and widths[i] else f"<th>{h}</th>"
        for i, h in enumerate(headers)
    )
    body = "".join("<tr>" + "".join(f"<td>{c}</td>" for c in r) + "</tr>" for r in rows)
    return f'<table><thead><tr>{th}</tr></thead><tbody>{body}</tbody></table>'


@router.get("/stats", response_class=HTMLResponse)
async def dashboard(request: Request, days: int = 7):
    _require_key(request)
    data = _summary(max(1, min(days, 90)))
    t = data["totals"] or {}
    views = t.get("views") or 0
    visitors = t.get("visitors") or 0
    used = t.get("users_who_used") or 0

    max_day = max([d["views"] or 0 for d in data["series"]] or [0])
    spark = "".join(
        f'<div class="col" title="{d["day"]}: {d["views"] or 0} views, {d["visitors"] or 0} visitors">'
        f'<b>{d["views"] or 0}</b>'
        f'<div class="fill" style="height:{0 if not max_day else max(3, round(100 * (d["views"] or 0) / max_day))}%"></div>'
        f'<span>{d["day"][5:]}</span></div>'
        for d in data["series"]
    )

    tool_rows = [
        (
            f"<b>{r['tool']}</b>",
            r["added"] or 0,
            r["started"] or 0,
            r["done"] or 0,
            r["failed"] or 0,
            r["downloads"] or 0,
            f"{r['avg_ms']} ms" if r["avg_ms"] else "—",
            (f"{round(100 * r['done'] / r['started'])}%" if r["started"] and r["done"] is not None else "—"),
        )
        for r in data["tools"]
    ]
    page_rows = [(f"<b>{p['path'] or '/'}</b>", p["n"], _bar(p["n"], max([x["n"] for x in data["pages"]] or [0]), 160)) for p in data["pages"]]
    err_rows = [(f"<code>{e['msg']}</code>", e["n"]) for e in data["errors"]]
    ref_rows = [(f"<b>{r['ref']}</b>", r["n"]) for r in data["referrers"]]

    dev = data["devices"]
    dev_line = " · ".join(f"{k}: {v}" for k, v in dev.items()) or "—"

    html = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="robots" content="noindex"/>
<title>DocTrim analytics — {days}d</title>
<style>
  :root {{ --ink:#1A1A1A; --soft:#6B6B6B; --line:#E8E8EC; --brand:#0055FF; }}
  * {{ box-sizing:border-box }}
  body {{ margin:0; font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; color:var(--ink); background:#F7F8FA }}
  header {{ background:#fff; border-bottom:1px solid var(--line); padding:18px 28px; display:flex; align-items:center; gap:16px; flex-wrap:wrap }}
  header h1 {{ font-size:17px; margin:0; letter-spacing:-.2px }}
  header .sp {{ flex:1 }}
  header a {{ color:var(--brand); text-decoration:none; font-weight:600; font-size:13px; padding:6px 10px; border:1px solid var(--line); border-radius:6px }}
  header a.on {{ background:var(--brand); color:#fff; border-color:var(--brand) }}
  main {{ padding:24px 28px; max-width:1180px; margin:0 auto }}
  .kpis {{ display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:14px; margin-bottom:18px }}
  .kpi {{ background:#fff; border:1px solid var(--line); border-radius:10px; padding:16px 18px }}
  .kpi b {{ display:block; font-size:30px; letter-spacing:-1px; line-height:1.1 }}
  .kpi span {{ color:var(--soft); font-size:12.5px; text-transform:uppercase; letter-spacing:.4px }}
  section {{ background:#fff; border:1px solid var(--line); border-radius:10px; padding:18px; margin-bottom:16px }}
  section h2 {{ font-size:13px; text-transform:uppercase; letter-spacing:.5px; color:var(--soft); margin:0 0 12px }}
  table {{ width:100%; border-collapse:collapse; font-size:13.5px }}
  th {{ text-align:left; color:var(--soft); font-weight:600; font-size:12px; text-transform:uppercase; letter-spacing:.4px; padding:0 8px 8px 0; border-bottom:1px solid var(--line) }}
  td {{ padding:7px 8px 7px 0; border-bottom:1px solid #F2F3F5; vertical-align:middle }}
  tr:last-child td {{ border-bottom:0 }}
  code {{ font-size:12.5px; background:#F4F5F7; padding:2px 5px; border-radius:4px }}
  .bar {{ display:inline-block; height:9px; background:var(--brand); border-radius:3px; vertical-align:middle }}
  .spark {{ display:flex; align-items:flex-end; gap:8px; height:130px }}
  .spark .col {{ flex:1 1 0; max-width:64px; display:flex; flex-direction:column; justify-content:flex-end; align-items:center; gap:5px; height:100% }}
  .spark b {{ font-size:11.5px; font-weight:600; color:var(--soft) }}
  .spark .fill {{ width:100%; background:var(--brand); border-radius:3px 3px 0 0; min-height:2px }}
  .spark span {{ font-size:10.5px; color:var(--soft) }}
  .empty {{ color:var(--soft); font-size:13px; margin:0 }}
  .muted {{ color:var(--soft); font-size:12.5px }}
</style></head><body>
<header>
  <h1>DocTrim · usage</h1>
  <div class="sp"></div>
  {''.join(f'<a class="{"on" if days == d else ""}" href="?days={d}&key={request.query_params.get("key","")}">{d}d</a>' for d in (1, 7, 30, 90))}
</header>
<main>
  <div class="kpis">
    <div class="kpi"><b>{views:,}</b><span>pageviews</span></div>
    <div class="kpi"><b>{visitors:,}</b><span>visitors</span></div>
    <div class="kpi"><b>{used:,}</b><span>people who ran a tool</span></div>
    <div class="kpi"><b>{round(100 * used / visitors) if visitors else 0}%</b><span>visitor → tool use</span></div>
  </div>
  <section><h2>Daily pageviews</h2><div class="spark">{spark or '<p class="empty">No data yet.</p>'}</div>
    <p class="muted">Devices (unique visitors): {dev_line}</p></section>
  <section><h2>Tools</h2>
    {_table(["Tool", "Files added", "Run started", "Done", "Failed", "Downloads", "Avg time", "Completion"], tool_rows)}</section>
  <section><h2>Pages</h2>{_table(["Path", "Views", ""], page_rows, ["58%", "70px", "auto"])}</section>
  <section><h2>Referrers</h2>{_table(["Host", "Views"], ref_rows)}</section>
  <section><h2>Errors</h2>{_table(["Message", "Count"], err_rows)}</section>
  <section><h2>Event mix</h2>{_table(["Event", "Count"], [(e["name"], e["n"]) for e in data["events"]])}</section>
  <p class="muted">Tracking since {data["first_day"] or "—"} · no cookies · visitor = daily-salted hash, no IPs stored · retention {RETENTION_DAYS} days</p>
</main></body></html>"""
    return HTMLResponse(html)


init()
