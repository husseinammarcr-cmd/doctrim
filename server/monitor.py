"""Uptime monitor for doctrim.pages.dev.

Runs from a systemd timer every few minutes and messages Telegram only when
something changes: one alert when a check starts failing (then a reminder every
30 min), one line when it recovers. No agent, no tokens, no dependencies beyond
the stdlib.

Checks
  1. public health   — https://doctrim.pages.dev/api/health returns the JSON
  2. real conversion — POST /api/compress with a 2-page PDF, expect %PDF bytes
                       (health can be up while the tool path is broken)
  3. origin service  — systemd doctrim-api active + 127.0.0.1:8090 responds
  4. disk            — at least DOCTRIM_MIN_FREE_GB free on the work volume

State lives in monitor_state.json so a restart does not re-alert.

Run once:  /opt/doctrim/venv/bin/python /opt/doctrim/monitor.py
Dry run:   ... --no-send   (prints instead of messaging)
"""
from __future__ import annotations

import json
import os
import shutil
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
STATE_PATH = HERE / "monitor_state.json"
LOG_PATH = HERE / "monitor.log"
ENV_PATH = Path("/root/.hermes/.env")

PAGES = os.getenv("DOCTRIM_PAGES", "https://doctrim.pages.dev")
CHAT_ID = os.getenv("DOCTRIM_ALERT_CHAT", "1675131358")
MIN_FREE_GB = float(os.getenv("DOCTRIM_MIN_FREE_GB", "2"))
REMIND_EVERY = int(os.getenv("DOCTRIM_REMIND_SECS", str(30 * 60)))
TIMEOUT_HEALTH = 15
TIMEOUT_JOB = 120
# Cloudflare rejects urllib's default UA (error 1010) — identify honestly instead.
UA = "DocTrimMonitor/1.0 (+https://doctrim.pages.dev)"

NO_SEND = "--no-send" in sys.argv


def log(line: str) -> None:
    stamp = time.strftime("%Y-%m-%d %H:%M:%S", time.gmtime())
    with LOG_PATH.open("a") as fh:
        fh.write(f"{stamp} {line}\n")
    try:  # keep the log small without logrotate
        if LOG_PATH.stat().st_size > 512_000:
            lines = LOG_PATH.read_text().splitlines()[-2000:]
            LOG_PATH.write_text("\n".join(lines) + "\n")
    except OSError:
        pass


def _token() -> str:
    if os.getenv("TELEGRAM_BOT_TOKEN"):
        return os.environ["TELEGRAM_BOT_TOKEN"]
    try:
        for line in ENV_PATH.read_text().splitlines():
            if line.startswith("TELEGRAM_BOT_TOKEN="):
                return line.split("=", 1)[1].strip().strip('"')
    except OSError:
        pass
    return ""


def send(text: str) -> bool:
    if NO_SEND:
        print("ALERT:", text)
        return True
    token = _token()
    if not token:
        log("alert not sent: no TELEGRAM_BOT_TOKEN")
        return False
    data = json.dumps({"chat_id": CHAT_ID, "text": text, "disable_web_page_preview": True}).encode()
    req = urllib.request.Request(
        f"https://api.telegram.org/bot{token}/sendMessage",
        data=data,
        headers={"content-type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status == 200
    except Exception as exc:  # noqa: BLE001
        log(f"alert failed: {exc}")
        return False


def _tiny_pdf() -> bytes:
    """A valid 2-page PDF built by hand (no reportlab on this box)."""
    objs = ["<< /Type /Catalog /Pages 2 0 R >>"]
    objs.append("<< /Type /Pages /Kids [3 0 R 5 0 R] /Count 2 >>")
    for i in range(2):
        objs.append(
            f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] "
            f"/Resources << /Font << /F1 7 0 R >> >> /Contents {4 + i * 2} 0 R >>"
        )
        stream = f"BT /F1 24 Tf 72 700 Td (DocTrim monitor page {i + 1}) Tj ET"
        objs.append(f"<< /Length {len(stream)} >>\nstream\n{stream}\nendstream")
    objs.append("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    out, offsets = "%PDF-1.4\n", []
    for n, body in enumerate(objs, 1):
        offsets.append(len(out))
        out += f"{n} 0 obj\n{body}\nendobj\n"
    xref = len(out)
    out += f"xref\n0 {len(objs) + 1}\n0000000000 65535 f \n"
    for off in offsets:
        out += f"{off:010d} 00000 n \n"
    out += f"trailer\n<< /Size {len(objs) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n"
    return out.encode("latin-1")


def check_health() -> tuple[bool, str]:
    started = time.time()
    try:
        req = urllib.request.Request(f"{PAGES}/api/health", headers={"user-agent": UA})
        with urllib.request.urlopen(req, timeout=TIMEOUT_HEALTH) as r:
            body = r.read(200).decode("utf-8", "replace")
            ms = int((time.time() - started) * 1000)
            ok = r.status == 200 and '"ok":true' in body.replace(" ", "")
            return ok, f"health {r.status} in {ms}ms"
    except Exception as exc:  # noqa: BLE001
        return False, f"health failed: {type(exc).__name__}: {exc}"


def check_convert() -> tuple[bool, str]:
    pdf = _tiny_pdf()
    boundary = "----doctrimmonitor"
    body = (
        f"--{boundary}\r\n"
        'Content-Disposition: form-data; name="file"; filename="monitor.pdf"\r\n'
        "Content-Type: application/pdf\r\n\r\n"
    ).encode() + pdf + f"\r\n--{boundary}--\r\n".encode()
    req = urllib.request.Request(
        f"{PAGES}/api/compress",
        data=body,
        headers={"content-type": f"multipart/form-data; boundary={boundary}", "user-agent": UA},
        method="POST",
    )
    started = time.time()
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT_JOB) as r:
            data = r.read()
            ms = int((time.time() - started) * 1000)
            if r.status == 200 and data[:4] == b"%PDF":
                return True, f"compress ok in {ms}ms ({len(data)} bytes)"
            return False, f"compress returned {r.status}, {len(data)} bytes, not a PDF"
    except urllib.error.HTTPError as exc:
        detail = ""
        try:
            detail = exc.read(200).decode("utf-8", "replace")
        except Exception:  # noqa: BLE001
            pass
        return False, f"compress HTTP {exc.code}: {detail}"
    except Exception as exc:  # noqa: BLE001
        return False, f"compress failed: {type(exc).__name__}: {exc}"


def check_service() -> tuple[bool, str]:
    try:
        active = subprocess.run(
            ["systemctl", "is-active", "doctrim-api"], capture_output=True, text=True, timeout=10
        ).stdout.strip()
    except Exception as exc:  # noqa: BLE001
        return False, f"systemctl: {exc}"
    if active != "active":
        return False, f"doctrim-api is {active or 'unknown'}"
    try:
        with socket.create_connection(("127.0.0.1", 8090), timeout=5):
            pass
    except OSError as exc:
        return False, f"port 8090: {exc}"
    return True, "service active"


def check_disk() -> tuple[bool, str]:
    if os.getenv("DOCTRIM_FORCE_FAIL") == "1":  # used to rehearse the alert path
        return False, "simulated failure"
    usage = shutil.disk_usage(HERE)
    free_gb = usage.free / 1e9
    ok = free_gb >= MIN_FREE_GB
    return ok, f"{free_gb:.1f} GB free"


CHECKS = [
    ("public health", check_health),
    ("file conversion", check_convert),
    ("api service", check_service),
    ("disk space", check_disk),
]


def load_state() -> dict:
    try:
        return json.loads(STATE_PATH.read_text())
    except Exception:  # noqa: BLE001
        return {}


def save_state(state: dict) -> None:
    tmp = STATE_PATH.with_suffix(".tmp")
    tmp.write_text(json.dumps(state, indent=1))
    tmp.replace(STATE_PATH)


def main() -> int:
    state = load_state()
    now = time.time()
    problems: list[tuple[str, str]] = []
    fixes: list[str] = []
    confirm = int(os.getenv("DOCTRIM_CONFIRM", "2"))  # consecutive fails before alerting
    any_fail = False

    for name, fn in CHECKS:
        ok, detail = fn()
        entry = state.setdefault(
            name, {"ok": True, "since": now, "notified": 0, "fails": 0, "alerted": False}
        )
        if ok:
            if entry.get("alerted"):
                fixes.append(f"✅ {name} recovered — {detail}")
            entry.update(ok=True, fails=0, alerted=False, detail=detail)
        else:
            any_fail = True
            entry["fails"] = entry.get("fails", 0) + 1
            entry["detail"] = detail
            if entry["fails"] == 1:
                entry["since"] = now  # start the outage clock at the first failure
            # One bad tick is usually a dropped packet, not an outage: require
            # `confirm` consecutive failures before waking the user.
            if entry["fails"] >= confirm:
                if not entry.get("alerted"):
                    entry.update(alerted=True, notified=now)
                    problems.append((name, f"🔴 {name} is failing — {detail}"))
                elif now - entry.get("notified", 0) >= REMIND_EVERY:
                    entry["notified"] = now
                    problems.append(
                        (
                            name,
                            f"🔴 {name} still failing for {int((now - entry['since']) / 60)} min — {detail}",
                        )
                    )
        log(f"{name}: {'ok' if ok else 'FAIL'} ({entry.get('fails', 0)} in a row) {detail}")

    if fixes:
        send("\n".join(fixes))
    for _name, msg in problems:
        send(msg)

    save_state(state)
    return 1 if any_fail else 0


if __name__ == "__main__":
    # `--notify "text"`: one-off page from a shell or cron job, same chat.
    if "--notify" in sys.argv:
        sys.exit(0 if send(sys.argv[sys.argv.index("--notify") + 1]) else 1)
    sys.exit(main())
