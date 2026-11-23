"""DocTrim API — server-side PDF tools.

Runs on the VPS behind Caddy (HTTPS). Handles operations that cannot run
in the browser: encryption/decryption, Office conversion, OCR, and
Ghostscript compression. The browser-only tools (merge/split/rotate/etc.)
stay client-side in the frontend.

Run:  uvicorn main:app --host 127.0.0.1 --port 8090
"""
from __future__ import annotations

import io
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

import limits  # noqa: E402  (local module)

# Installed before CORS on purpose: Starlette puts the last added middleware
# outermost, so CORS ends up wrapping the 429 responses too.
limits.install(app)

from analytics import router as analytics_router  # noqa: E402  (local module)


app.include_router(analytics_router)

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


def _looks_like_scan(path: Path, sample_pages: int = 3) -> bool:
    """True when the first pages are images with (almost) no extractable text."""
    try:
        import pymupdf

        with pymupdf.open(path) as doc:
            pages = min(sample_pages, doc.page_count)
            if pages == 0:
                return False
            empty = 0
            for i in range(pages):
                page = doc[i]
                text = (page.get_text("text") or "").strip()
                has_img = bool(page.get_images(full=False))
                if has_img and len(text) < 60:
                    empty += 1
            return empty >= max(1, pages - 1)
    except Exception:
        return False


@app.post("/api/pdf-to-word")
async def pdf_to_word(file: UploadFile = File(...)):
    d = _tmpdir()
    try:
        src = await _save(file, d)
        out = d / (src.stem + ".docx")
        from pdf2docx import Converter

        def page_count() -> int:
            try:
                import pymupdf

                with pymupdf.open(src) as doc:
                    return doc.page_count
            except Exception:
                return 0

        def downsample(target: Path, dpi: int = 150) -> bool:
            """Ghostscript copy with images resampled (text stays vector)."""
            try:
                _run([
                    "gs", "-sDEVICE=pdfwrite", "-dCompatibilityLevel=1.5",
                    "-dNOPAUSE", "-dQUIET", "-dBATCH",
                    "-dDownsampleColorImages=true", f"-dColorImageResolution={dpi}",
                    "-dColorImageDownsampleType=/Bicubic",
                    "-dDownsampleGrayImages=true", f"-dGrayImageResolution={dpi}",
                    "-dGrayImageDownsampleType=/Bicubic",
                    "-dDetectDuplicateImages=true", "-dJPEGQ=82",
                    f"-sOutputFile={target}", str(src),
                ], timeout=240)
                return target.exists() and target.stat().st_size > 0
            except Exception:
                return False

        # pdf2docx is single-threaded by default; pages are independent, so
        # spreading them over a few cores cuts conversion time roughly 3x on this box.
        workers = max(1, min(4, os.cpu_count() or 1))

        def convert(src_path: Path, dest: Path) -> None:
            cv = Converter(str(src_path))
            try:
                cv.convert(str(dest), multi_processing=workers > 1, cpu_count=workers)
            except Exception:
                # multi-processing can fail on odd page content; never lose the job
                cv.convert(str(dest))
            cv.close()

        # Scanned PDFs carry full-resolution page images (300 dpi+), so pdf2docx
        # emits a huge .docx (12 scanned pages ≈ 30 MB). Downsample those first;
        # for mixed/text PDFs convert as-is and only retry when the result is big.
        scan_like = _looks_like_scan(src)
        pages = page_count()

        # Pick the first-pass resolution so the 20 MB retry below rarely fires:
        # a second full conversion is the main reason big scans felt "stuck".
        if scan_like:
            first_dpi = 130 if pages > 40 else 150 if pages > 12 else 170
        else:
            first_dpi = 150

        small_pdf = d / "downsampled.pdf"
        pre = scan_like and downsample(small_pdf, first_dpi)
        convert(small_pdf if pre else src, out)

        # Still oversized? One more pass at a lower resolution, keep the smaller file.
        if out.exists() and out.stat().st_size > 20 * 1024 * 1024:
            alt_pdf = d / "alt.pdf"
            retry_dpi = max(96, first_dpi - 40) if pre else 150
            if downsample(alt_pdf, retry_dpi):
                alt = d / "alt.docx"
                convert(alt_pdf, alt)
                if alt.exists() and alt.stat().st_size < out.stat().st_size:
                    alt.replace(out)

        if not out.exists():
            raise HTTPException(500, "Conversion produced no output")

        headers = {"X-Doctrim-Note": "scanned" if scan_like else "text"}
        return FileResponse(
            out,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            filename=out.name,
            headers=headers,
            background=BackgroundTask(_cleanup, d),
        )
    except HTTPException:
        _cleanup(d)
        raise
    except Exception as e:
        _cleanup(d)
        raise HTTPException(500, str(e))


@app.post("/api/ocr")
async def ocr(file: UploadFile = File(...), lang: str = Form("ara+eng")):
    d = _tmpdir()
    try:
        src = await _save(file, d)
        out = d / "ocr.pdf"

        # Accuracy settings, measured on a skewed/noisy 150 dpi scan with an
        # Arabic + English page (word recall / character similarity):
        #   plain ara+eng                59% / 59%
        #   + oversample 300, deskew     93% / 97%
        #   + tessdata_best models      100% / 100%
        # Arabic pages nearly always carry Latin text (numbers, brand names), and
        # running ara alone mangles it, so English is always included.
        langs = (lang or "ara+eng").strip()
        if "eng" not in [p.strip() for p in langs.split("+")]:
            langs = f"{langs}+eng"

        _run(
            [
                "ocrmypdf",
                "--language", langs,
                "--skip-text",
                "--oversample", "300",   # low-res phone scans OCR far better upsampled
                "--deskew",              # phone photos are never straight
                "--rotate-pages",        # page shot sideways/upside down
                str(src),
                str(out),
            ],
            timeout=300,
        )
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


@app.post("/api/flatten-pdf")
async def flatten_pdf(file: UploadFile = File(...)):
    """Bake annotations and form fields into the page content.

    After this the pages look identical but carry no annotations and are no
    longer fillable forms — what "flatten" means everywhere else.
    """
    import pymupdf

    d = _tmpdir()
    try:
        src = await _save(file, d)
        out = d / (Path(src.stem).name + "-flattened.pdf")
        with pymupdf.open(src) as doc:
            if doc.page_count == 0:
                raise HTTPException(422, "This PDF has no pages")
            doc.bake(annots=True, widgets=True)
            doc.save(out, garbage=3, deflate=True)
        return FileResponse(out, media_type="application/pdf", filename=out.name,
                            background=BackgroundTask(_cleanup, d))
    except HTTPException:
        _cleanup(d)
        raise
    except Exception as e:
        _cleanup(d)
        raise HTTPException(500, str(e))


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
                # JPEG, not PNG: a lossless PNG of a photo-heavy page is 3-4 MB,
                # JPEG at 144 dpi is ~200 KB and looks the same on a slide.
                pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
                slide = prs.slides.add_slide(blank)
                ratio = min(slide_w / pix.width, slide_h / pix.height)
                w, h = int(pix.width * ratio), int(pix.height * ratio)
                slide.shapes.add_picture(
                    io.BytesIO(pix.tobytes("jpeg", jpg_quality=80)),
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
