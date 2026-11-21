import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

export type PdfJsDoc = pdfjsLib.PDFDocumentProxy

export async function openPdfJs(data: Uint8Array): Promise<PdfJsDoc> {
  // copy into a fresh ArrayBuffer so the worker owns its bytes
  const buf = data.slice().buffer
  return pdfjsLib.getDocument({ data: buf }).promise
}

export async function pageCount(data: Uint8Array): Promise<number> {
  const doc = await openPdfJs(data)
  const n = doc.numPages
  await doc.destroy()
  return n
}

/** Render a 1-based page to a canvas at the given scale. */
export async function renderPage(
  doc: PdfJsDoc,
  pageNumber: number,
  scale = 1.5,
): Promise<HTMLCanvasElement> {
  const page = await doc.getPage(pageNumber)
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(viewport.width)
  canvas.height = Math.ceil(viewport.height)
  const ctx = canvas.getContext('2d')!
  // white background (PDFs can be transparent)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  await page.render({ canvasContext: ctx, viewport, intent: 'print', annotationMode: 0 }).promise
  page.cleanup()
  return canvas
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Failed to encode image'))),
      type,
      quality,
    )
  })
}

/** Small thumbnail dataURL for page previews. */
export async function thumbnail(doc: PdfJsDoc, pageNumber: number, maxWidth = 180): Promise<string> {
  const page = await doc.getPage(pageNumber)
  const base = page.getViewport({ scale: 1 })
  const scale = maxWidth / base.width
  const canvas = await renderPage(doc, pageNumber, scale)
  page.cleanup()
  return canvas.toDataURL('image/png')
}
