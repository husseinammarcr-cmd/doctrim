"""Abuse protection for the DocTrim API.

Two independent guards, both cheap and dependency-free:

1. Per-client rate limits (sliding window) — the API is reachable from the
   internet through Cloudflare, so a single script could otherwise burn the
   box's CPU with OCR/Office conversions forever.
2. A global in-flight cap for heavy conversions — this server has few cores,
   so beyond N concurrent jobs everybody gets slower instead of served.

Client identity comes from `cf-connecting-ip` / `x-forwarded-for` because the
process only ever sees 127.0.0.1 (Caddy proxies to it). Note that a lot of
Iraqi traffic is CGNAT: many real users can share one public IP, so the limits
are deliberately generous — they are meant to stop scripts, not crowds.

Tune with env vars:
    DOCTRIM_RL_HEAVY_MIN   (default 12)   heavy jobs per client per minute
    DOCTRIM_RL_HEAVY_HOUR  (default 150)  heavy jobs per client per hour
    DOCTRIM_RL_LIGHT_MIN   (default 90)   any request per client per minute
    DOCTRIM_RL_CONCURRENCY (default 3)    heavy jobs in flight server-wide
"""
from __future__ import annotations

import json
import os
import threading
import time
from collections import defaultdict, deque

from starlette.responses import Response

HEAVY_PATHS = {
    "/api/ocr",
    "/api/pdf-to-word",
    "/api/pdf-to-excel",
    "/api/pdf-to-ppt",
    "/api/office-to-pdf",
    "/api/compress",
    "/api/unlock",
    "/api/protect",
    "/api/flatten-pdf",
    "/api/force-download",
}

HEAVY_MIN = int(os.getenv("DOCTRIM_RL_HEAVY_MIN", "15"))
HEAVY_HOUR = int(os.getenv("DOCTRIM_RL_HEAVY_HOUR", "200"))
LIGHT_MIN = int(os.getenv("DOCTRIM_RL_LIGHT_MIN", "120"))
# 5 conversion workers plus a short queue: a burst is served as 24
# concurrent jobs (the rest get an instant "busy" instead of a dead tab), and
# memory stays bounded because each in-flight request holds its upload in RAM.
MAX_INFLIGHT = int(os.getenv("DOCTRIM_RL_CONCURRENCY", "24"))
# Server-wide ceilings: whatever the identity of the caller — even a botnet with
# thousands of addresses — this box never runs more than this per minute/day.
GLOBAL_HEAVY_MIN = int(os.getenv("DOCTRIM_RL_GLOBAL_MIN", "120"))
GLOBAL_HEAVY_DAY = int(os.getenv("DOCTRIM_RL_GLOBAL_DAY", "6000"))

_BUSY_MSG = (
    "The server is handling a lot of files right now. "
    "Please try again in a few seconds."
)
_RATE_MSG = "Too many requests. Please wait {secs}s and try again."


class _Window:
    """Sliding-window counters keyed by (bucket, client)."""

    def __init__(self) -> None:
        self._hits: dict[tuple[str, str], deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()
        self._calls = 0

    def hit(self, bucket: str, client: str, limit: int, window: int) -> int:
        """Record a request. Returns 0 when allowed, else seconds to wait."""
        now = time.time()
        key = (bucket, client)
        with self._lock:
            d = self._hits[key]
            cutoff = now - window
            while d and d[0] <= cutoff:
                d.popleft()
            if len(d) >= limit:
                return max(1, int(d[0] + window - now) + 1)
            d.append(now)
            self._calls += 1
            if self._calls % 2000 == 0:
                self._prune(now)
            return 0

    def _prune(self, now: float) -> None:
        stale = [k for k, d in self._hits.items() if not d or d[-1] < now - 7200]
        for k in stale:
            self._hits.pop(k, None)


_window = _Window()
_inflight = 0
_inflight_lock = threading.Lock()


def _client(request) -> str:
    # The Pages Function forwards the real visitor in x-doctrim-client because
    # Cloudflare rewrites x-forwarded-for with its own edge IP on subrequests.
    for header in ("x-doctrim-client", "cf-connecting-ip", "x-real-ip"):
        value = request.headers.get(header)
        if value:
            return value.split(",")[0].strip()
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def client_ip(request) -> str:
    """Public alias: analytics and the limiter must agree on who a visitor is."""
    return _client(request)


def _reject(seconds: int, message: str) -> Response:
    return Response(
        content=json.dumps({"detail": message}),
        status_code=429,
        media_type="application/json",
        headers={"retry-after": str(seconds), "cache-control": "no-store"},
    )


def install(app) -> None:
    """Register the guards on a FastAPI app."""

    @app.middleware("http")
    async def _guard(request, call_next):
        global _inflight

        path = request.url.path
        if path == "/api/health" or request.method == "OPTIONS":
            return await call_next(request)

        client = _client(request)

        if os.getenv("DOCTRIM_RL_DEBUG") == "1":
            print(f"rl-debug {path} {client}", flush=True)

        wait = _window.hit("light", client, LIGHT_MIN, 60)
        if wait:
            return _reject(wait, _RATE_MSG.format(secs=wait))

        heavy = path in HEAVY_PATHS
        if heavy:
            wait = _window.hit("global-min", "all", GLOBAL_HEAVY_MIN, 60)
            if not wait:
                wait = _window.hit("global-day", "all", GLOBAL_HEAVY_DAY, 86400)
            if not wait:
                wait = _window.hit("heavy-min", client, HEAVY_MIN, 60)
            if not wait:
                wait = _window.hit("heavy-hour", client, HEAVY_HOUR, 3600)
            if wait:
                return _reject(wait, _RATE_MSG.format(secs=wait))

            with _inflight_lock:
                busy = _inflight >= MAX_INFLIGHT
                if not busy:
                    _inflight += 1
            if busy:
                return _reject(5, _BUSY_MSG)
            try:
                return await call_next(request)
            finally:
                with _inflight_lock:
                    _inflight -= 1

        return await call_next(request)
