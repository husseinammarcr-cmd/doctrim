# DocTrim

**We make PDF easy.** A free, privacy-friendly PDF toolkit with a design modeled on
Smallpdf. Built as a real React + TypeScript application (not static HTML), deployed
on Cloudflare Pages, with an optional FastAPI backend for server-side tools.

## Stack
- **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS, React Router
- **Client-side PDF engine:** `pdf-lib` (merge/split/rotate/organize/images/watermark/
  numbering/sign) + `pdf.js` (rendering, thumbnails, PDF→image, rasterizing compression)
- **Server (optional):** FastAPI + pikepdf + Ghostscript + LibreOffice + OCRmyPDF (`server/`)
- **Hosting:** Cloudflare Pages (frontend), Contabo VPS + Caddy (API)

## Tools
Ready (run entirely in your browser — files never leave your device):
Merge, Split, Rotate, Organize, Delete pages, Extract pages, JPG→PDF, PNG→PDF,
PDF→JPG, PDF→PNG, Compress, Watermark, Number pages, Sign, PDF Reader.

Server-backed (enabled when `VITE_API_URL` is set and the API is deployed):
Protect, Unlock, Word/Excel/PPT→PDF, PDF→Word, OCR, strong compression.

## Develop
```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build to dist/
npm run preview    # serve the production build
```

## Deploy frontend (Cloudflare Pages)
Connect this repo in Cloudflare Pages with:
- **Build command:** `npm run build`
- **Build output directory:** `dist`
- (Optional) **Env var:** `VITE_API_URL=https://api.yourdomain.com`

`public/_redirects` provides SPA fallback (`/* /index.html 200`).

## Deploy backend (VPS)
See `server/README.md`. In short: `cd server && sudo bash deploy.sh api.yourdomain.com`.

## Design
Source Sans 3, primary blue `#0055FF`, white surfaces, rainbow-grid logo, colorful
rounded tool icons, editor-mockup hero illustration. Homepage sections: hero,
popular tools, feature blocks, mobile, pricing, trust, CTA, full tool directory, footer.

## Privacy
All currently-ready tools process files locally in the browser using JavaScript and
WebAssembly-free `pdf-lib`/`pdf.js`. No upload, no account, no watermark.
