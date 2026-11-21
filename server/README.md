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
- `POST /api/ocr` — file, lang (ocrmypdf/Tesseract)

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
