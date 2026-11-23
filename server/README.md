# DocTrim API (server-side tools)

FastAPI service for operations that cannot run in the browser:
encryption/decryption, Office↔PDF conversion, OCR, and Ghostscript compression.
The browser-only tools (merge, split, rotate, organize, images, watermark, etc.)
run client-side in the frontend and do not need this service.

## Endpoints
- `GET  /api/health`
- `POST /api/compress` — file, level=basic|recommended|extreme (Ghostscript)
- `POST /api/protect` — file, password (pikepdf AES-256)
- `POST /api/unlock` — file, password
- `POST /api/office-to-pdf` — file (.docx/.xlsx/.pptx via LibreOffice)
- `POST /api/pdf-to-word` — file (pdf2docx)
- `POST /api/pdf-to-excel` — file (PyMuPDF table finder → openpyxl, one sheet per table)
- `POST /api/pdf-to-ppt` — file (PyMuPDF render → python-pptx, one slide per page)
- `POST /api/flatten-pdf` — file (PyMuPDF bake: annotations + form widgets → page content)
- `POST /api/ocr` — file, lang=eng|ara|fra|deu|spa (ocrmypdf/Tesseract)
- `POST /api/force-download` — file, filename (echoes with Content-Disposition: attachment for iOS Safari)

All POST endpoints are `multipart/form-data` and return the processed file.

## Deploy on the VPS (Ubuntu/Debian + Caddy)
```bash
cd server
sudo bash deploy.sh api.yourdomain.com
# or, without a domain (auto TLS via sslip.io):
sudo bash deploy.sh
```
The script installs ghostscript/libreoffice/tesseract/ocrmypdf, creates a venv at
`/opt/doctrim`, installs a systemd unit (`doctrim-api`), and adds a Caddy site.

## Frontend wiring
Set `VITE_API_URL=https://api.yourdomain.com` in the frontend build environment
(Cloudflare Pages → Settings → Environment variables). The client in
`src/lib/api.ts` reads it. Server-backed tools are enabled once this is set and
the service is healthy.

## Local run
```bash
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8090
```

## Notes
- Max upload size: `DOCTRIM_MAX_MB` (default 50).
- CORS origins: `DOCTRIM_ORIGINS` (comma-separated).
- Temp files are cleaned up after each response.

## Abuse protection

`limits.py` guards every request (installed before the routes in `main.py`):

| env var | default | meaning |
|---|---|---|
| `DOCTRIM_RL_HEAVY_MIN` | 15 | heavy jobs (OCR, Office, compress…) per visitor per minute |
| `DOCTRIM_RL_HEAVY_HOUR` | 200 | heavy jobs per visitor per hour |
| `DOCTRIM_RL_LIGHT_MIN` | 120 | any request per visitor per minute |
| `DOCTRIM_RL_CONCURRENCY` | 5 | heavy jobs running at once, server-wide |
| `DOCTRIM_RL_GLOBAL_MIN` | 120 | heavy jobs per minute for the whole box |
| `DOCTRIM_RL_GLOBAL_DAY` | 6000 | heavy jobs per day for the whole box |

Visitors are identified by `x-doctrim-client`, which the Pages Function fills from
`cf-connecting-ip` — Cloudflare overwrites `x-forwarded-for` with its own edge IP
on subrequests, so that header is useless for limits and analytics.

The origin also refuses (404) any request that does not come from Cloudflare's
edge ranges, because the Pages Function is its only legitimate caller.
