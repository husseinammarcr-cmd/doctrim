"""DocTrim API — server-side PDF tools.

Runs on the VPS behind Caddy (HTTPS). Handles operations that cannot run
in the browser: encryption/decryption, Office conversion, OCR, and
Ghostscript compression. The browser-only tools (merge/split/rotate/etc.)
stay client-side in the frontend.

Run:  uvicorn main:app --host 127.0.0.1 --port 8090
"""
from __future__ import annotations

import os
import re
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
    allow_origin_regex=r"https://([a-z0-9-]+\.)*doctrim\.pages\.dev",
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


@app.post("/api/force-download")
async def force_download(file: UploadFile = File(...), filename: str = Form("download")):
    """Echo a file back with Content-Disposition: attachment so browsers
    (especially iOS Safari) download it instead of opening it inline."""
    d = _tmpdir()
    try:
        src = await _save(file, d)
        safe = Path(filename).name or "download"
        return FileResponse(
            src,
            media_type="application/octet-stream",
            filename=safe,
            background=BackgroundTask(_cleanup, d),
        )
    except Exception as e:
        _cleanup(d)
        raise HTTPException(500, str(e))


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


def _cell_text(value):
    """Join a cell's wrapped lines back into one value.

    PDF cells wrap at column width, so extracted text often arrives as
    "Fifth\\nYear" or even "Grad\\ne".  Lines that continue a broken word
    (short fragment or starting lowercase) are glued, others space-joined.
    Numeric cells are returned as int/float so Excel can do math on them.
    """
    if value is None:
        return ""
    raw = str(value).strip()
    if not raw:
        return ""
    out = ""
    for part in (p.strip() for p in raw.splitlines()):
        if not part:
            continue
        if not out:
            out = part
            continue
        first = part.split()[0]
        out += part if (len(first) <= 2 or first[0].islower()) else " " + part
    if re.fullmatch(r"-?\d{1,3}(,\d{3})+(\.\d+)?", out):  # 1,234.50
        return float(out.replace(",", ""))
    if re.fullmatch(r"-?\d+", out):
        return int(out)
    if re.fullmatch(r"-?\d+\.\d+", out):
        return float(out)
    return out


def _tidy_rows(rows):
    """Drop all-empty columns and glue leftover single-cell continuation rows
    (e.g. a header split as "Scor" / "e" by a narrow column)."""
    if not rows:
        return rows
    width = max(len(r) for r in rows)
    rows = [list(r) + [""] * (width - len(r)) for r in rows]
    # merge rows that hold a single leftover fragment
    merged = [rows[0]]
    for row in rows[1:]:
        filled = [(i, c) for i, c in enumerate(row) if c != "" and c is not None]
        if len(filled) == 1 and len(str(filled[0][1])) <= 3:
            i, c = filled[0]
            prev = merged[-1][i]
            prev_s = "" if prev is None else str(prev)
            sep = "" if (len(str(c)) <= 2 or str(c)[0].islower()) else " "
            merged[-1][i] = (prev_s + sep + str(c)) if prev_s else str(c)
        else:
            merged.append(row)
    # drop columns that ended up empty
    keep = [j for j in range(width) if any(r[j] not in ("", None) for r in merged)]
    return [[r[j] for j in keep] for r in merged]


@app.post("/api/pdf-to-excel")
async def pdf_to_excel(file: UploadFile = File(...)):
    """Extract tables from a PDF into an .xlsx workbook.

    Uses PyMuPDF's table finder: one sheet per detected table ("P4 T2").
    Pages with no table are written as text into a "Page N" sheet so the
    user always gets something useful back.
    """
    import fitz  # PyMuPDF
    from openpyxl import Workbook
    from openpyxl.styles import Font
    from openpyxl.utils import get_column_letter

    d = _tmpdir()
    try:
        src = await _save(file, d)
        out = d / (Path(src.stem).name + ".xlsx")

        wb = Workbook()
        wb.remove(wb.active)  # drop the empty default sheet
        tables_found = 0

        with fitz.open(src) as doc:
            if doc.page_count == 0:
                raise HTTPException(422, "This PDF has no pages")
            for pno, page in enumerate(doc, start=1):
                try:
                    tables = page.find_tables().tables
                except Exception:
                    tables = []

                extracted = False
                for tno, table in enumerate(tables, start=1):
                    rows = table.extract() or []
                    rows = [[_cell_text(c) for c in row] for row in rows]
                    rows = _tidy_rows(rows)
                    if not any(any((c != "" and c is not None) for c in row) for row in rows):
                        continue
                    extracted = True
                    tables_found += 1
                    ws = wb.create_sheet(f"P{pno} T{tno}")
                    width = max(len(r) for r in rows)
                    for row in rows:
                        ws.append(row + [""] * (width - len(row)))
                    for cell in ws[1]:  # bold header row
                        cell.font = Font(bold=True)
                    for i in range(1, width + 1):
                        ws.column_dimensions[get_column_letter(i)].width = 18

                if not extracted:
                    text = page.get_text("text") or ""
                    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
                    if lines:
                        ws = wb.create_sheet(f"Page {pno}")
                        for ln in lines:
                            parts = re.split(r"\s{2,}", ln)
                            ws.append(parts if len(parts) > 1 else [ln])
                        ws.column_dimensions["A"].width = 60

        if not wb.sheetnames:
            raise HTTPException(
                422,
                "No tables or selectable text found. If this PDF is a scan, run PDF OCR first.",
            )

        wb.save(out)
        return FileResponse(
            out,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            filename=out.name,
            background=BackgroundTask(_cleanup, d),
        )
    except HTTPException:
        _cleanup(d)
        raise
    except Exception as e:
        _cleanup(d)
        raise HTTPException(500, str(e))


@app.post("/api/pdf-to-ppt")
async def pdf_to_ppt(file: UploadFile = File(...)):
    """Turn every PDF page into a full-bleed PowerPoint slide (one image each)."""
    import fitz  # PyMuPDF
    from pptx import Presentation
    from pptx.util import Emu

    EMU_PER_INCH = 914400
    d = _tmpdir()
    try:
        src = await _save(file, d)
        out = d / (Path(src.stem).name + ".pptx")

        prs = Presentation()
        with fitz.open(src) as doc:
            if doc.page_count == 0:
                raise HTTPException(422, "This PDF has no pages")
            if doc.page_count > 300:
                raise HTTPException(422, "Too many pages (max 300)")

            rect = doc[0].rect
            aspect = (rect.width / rect.height) if rect.height else 0.7727
            slide_w = 10 * EMU_PER_INCH
            slide_h = int(slide_w / aspect)
            cap = 10 * EMU_PER_INCH
            if slide_h > cap:  # very tall page — shrink to fit
                slide_w = int(slide_w * cap / slide_h)
                slide_h = cap
            prs.slide_width = Emu(int(slide_w))
            prs.slide_height = Emu(int(slide_h))
            blank = prs.slide_layouts[6]  # "Blank"

            for i, page in enumerate(doc):
                pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
                img = d / f"page-{i}.png"
                pix.save(img)
                slide = prs.slides.add_slide(blank)
                ratio = min(slide_w / pix.width, slide_h / pix.height)
                w, h = int(pix.width * ratio), int(pix.height * ratio)
                slide.shapes.add_picture(
                    str(img),
                    Emu(int((slide_w - w) / 2)),
                    Emu(int((slide_h - h) / 2)),
                    width=Emu(w), height=Emu(h),
                )

        prs.save(out)
        return FileResponse(
            out,
            media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
            filename=out.name,
            background=BackgroundTask(_cleanup, d),
        )
    except HTTPException:
        _cleanup(d)
        raise
    except Exception as e:
        _cleanup(d)
        raise HTTPException(500, str(e))
