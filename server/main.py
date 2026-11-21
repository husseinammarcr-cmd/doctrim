"""DocTrim API — server-side PDF tools.

Runs on the VPS behind Caddy (HTTPS). Handles operations that cannot run
in the browser: encryption/decryption, Office conversion, OCR, and
Ghostscript compression. The browser-only tools (merge/split/rotate/etc.)
stay client-side in the frontend.

Run:  uvicorn main:app --host 127.0.0.1 --port 8090
"""
from __future__ import annotations

import os
import shutil
import subprocess
import tempfile
import uuid
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask

MAX_BYTES = int(os.getenv("DOCTRIM_MAX_MB", "50")) * 1024 * 1024
ALLOWED_ORIGINS = os.getenv(
    "DOCTRIM_ORIGINS",
    "https://doctrim.pages.dev,http://localhost:5173,http://127.0.0.1:4173",
).split(",")

app = FastAPI(title="DocTrim API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in ALLOWED_ORIGINS if o.strip()],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


def _tmpdir() -> Path:
    d = Path(tempfile.mkdtemp(prefix="doctrim-"))
    return d


async def _save(upload: UploadFile, d: Path) -> Path:
    data = await upload.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(413, f"File too large (max {MAX_BYTES // (1024*1024)} MB)")
    name = upload.filename or "input"
    # keep only the basename to avoid path traversal
    p = d / Path(name).name
    p.write_bytes(data)
    return p


def _cleanup(d: Path):
    shutil.rmtree(d, ignore_errors=True)


def _run(cmd: list[str], timeout: int = 180):
    proc = subprocess.run(cmd, capture_output=True, timeout=timeout)
    if proc.returncode != 0:
        raise HTTPException(500, f"Processing failed: {proc.stderr.decode()[:400]}")
    return proc


@app.get("/api/health")
def health():
    return {"ok": True, "service": "doctrim-api"}


@app.post("/api/compress")
async def compress(file: UploadFile = File(...), level: str = Form("recommended")):
    import pikepdf

    d = _tmpdir()
    try:
        src = await _save(file, d)
        out = d / "compressed.pdf"
        if level == "basic":
            with pikepdf.open(src) as pdf:
                pdf.save(out, object_stream_mode=pikepdf.ObjectStreamMode.generate)
        else:
            setting = {"recommended": "/ebook", "extreme": "/screen"}.get(level, "/ebook")
            _run([
                "gs", "-sDEVICE=pdfwrite", "-dCompatibilityLevel=1.5",
                f"-dPDFSETTINGS={setting}", "-dNOPAUSE", "-dQUIET", "-dBATCH",
                f"-sOutputFile={out}", str(src),
            ])
        if not out.exists() or out.stat().st_size == 0:
            raise HTTPException(500, "Compression produced no output")
        return FileResponse(out, media_type="application/pdf", filename="compressed.pdf",
                            background=BackgroundTask(_cleanup, d))
    except HTTPException:
        _cleanup(d)
        raise
    except Exception as e:
        _cleanup(d)
        raise HTTPException(500, str(e))


@app.post("/api/protect")
async def protect(file: UploadFile = File(...), password: str = Form(...)):
    import pikepdf

    d = _tmpdir()
    try:
        src = await _save(file, d)
        out = d / "protected.pdf"
        with pikepdf.open(src) as pdf:
            pdf.save(out, encryption=pikepdf.Encryption(owner=password, user=password, R=6))
        return FileResponse(out, media_type="application/pdf", filename="protected.pdf",
                            background=BackgroundTask(_cleanup, d))
    except Exception as e:
        _cleanup(d)
        raise HTTPException(500, str(e))


@app.post("/api/unlock")
async def unlock(file: UploadFile = File(...), password: str = Form("")):
    import pikepdf

    d = _tmpdir()
    try:
        src = await _save(file, d)
        out = d / "unlocked.pdf"
        with pikepdf.open(src, password=password) as pdf:
            pdf.save(out)
        return FileResponse(out, media_type="application/pdf", filename="unlocked.pdf",
                            background=BackgroundTask(_cleanup, d))
    except pikepdf.PasswordError:
        _cleanup(d)
        raise HTTPException(401, "Wrong password")
    except Exception as e:
        _cleanup(d)
        raise HTTPException(500, str(e))


@app.post("/api/office-to-pdf")
async def office_to_pdf(file: UploadFile = File(...)):
    d = _tmpdir()
    try:
        src = await _save(file, d)
        _run([
            "soffice", "--headless", "--norestore", "--convert-to", "pdf",
            "--outdir", str(d), str(src),
        ], timeout=240)
        out = d / (src.stem + ".pdf")
        if not out.exists():
            raise HTTPException(500, "LibreOffice produced no PDF")
        return FileResponse(out, media_type="application/pdf", filename=out.name,
                            background=BackgroundTask(_cleanup, d))
    except HTTPException:
        _cleanup(d)
        raise
    except Exception as e:
        _cleanup(d)
        raise HTTPException(500, str(e))


@app.post("/api/pdf-to-word")
async def pdf_to_word(file: UploadFile = File(...)):
    d = _tmpdir()
    try:
        src = await _save(file, d)
        out = d / (src.stem + ".docx")
        from pdf2docx import Converter

        cv = Converter(str(src))
        cv.convert(str(out))
        cv.close()
        if not out.exists():
            raise HTTPException(500, "Conversion produced no output")
        return FileResponse(
            out,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            filename=out.name, background=BackgroundTask(_cleanup, d),
        )
    except HTTPException:
        _cleanup(d)
        raise
    except Exception as e:
        _cleanup(d)
        raise HTTPException(500, str(e))


@app.post("/api/ocr")
async def ocr(file: UploadFile = File(...), lang: str = Form("eng")):
    d = _tmpdir()
    try:
        src = await _save(file, d)
        out = d / "ocr.pdf"
        _run(["ocrmypdf", "--language", lang, "--skip-text", str(src), str(out)], timeout=300)
        if not out.exists():
            raise HTTPException(500, "OCR produced no output")
        return FileResponse(out, media_type="application/pdf", filename="ocr.pdf",
                            background=BackgroundTask(_cleanup, d))
    except HTTPException:
        _cleanup(d)
        raise
    except Exception as e:
        _cleanup(d)
        raise HTTPException(500, str(e))
