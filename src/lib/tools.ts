export type ToolStatus = 'ready' | 'soon'
export type ToolCategory =
  | 'popular'
  | 'convert-from'
  | 'convert-to'
  | 'organize'
  | 'edit'
  | 'protect'
  | 'ai'

export interface Tool {
  slug: string
  name: string
  desc: string
  category: ToolCategory
  /** tailwind-safe hex for the icon tile */
  color: string
  /** lucide icon key handled by ToolIcon */
  icon: string
  status: ToolStatus
  /** accepted input mime/extensions */
  accept: string
  /** allow multiple input files */
  multi?: boolean
  /** short label for the input file type */
  inputLabel: string
  /** requires the server API (VITE_API_URL) */
  server?: boolean
}

export const TOOLS: Tool[] = [
  // ---- Popular (homepage grid) ----
  { slug: 'pdf-to-word', name: 'PDF to Word', desc: 'Convert PDFs to editable Word documents', category: 'popular', color: '#2B8FE3', icon: 'file-word', status: 'soon', accept: '.pdf', inputLabel: 'PDF' },
  { slug: 'merge-pdf', name: 'Merge PDF', desc: 'Combine multiple PDFs into one unified document', category: 'popular', color: '#8B48FE', icon: 'merge', status: 'ready', accept: '.pdf', multi: true, inputLabel: 'PDF' },
  { slug: 'jpg-to-pdf', name: 'JPG to PDF', desc: 'Transform JPG, PNG, BMP, GIF, and TIFF images to PDF', category: 'popular', color: '#FF8E00', icon: 'image', status: 'ready', accept: 'image/*', multi: true, inputLabel: 'Images' },
  { slug: 'sign-pdf', name: 'Sign PDF', desc: 'Create an electronic signature and sign your documents', category: 'popular', color: '#CA41FC', icon: 'pen', status: 'ready', accept: '.pdf', inputLabel: 'PDF' },
  { slug: 'edit-pdf', name: 'Edit PDF', desc: 'Add text, shapes, images and freehand annotations to your PDF', category: 'popular', color: '#00C0FF', icon: 'edit', status: 'soon', accept: '.pdf', inputLabel: 'PDF' },
  { slug: 'compress-pdf', name: 'Compress PDF', desc: 'Reduce the size of your PDF without losing quality', category: 'popular', color: '#FF5400', icon: 'compress', status: 'ready', accept: '.pdf', inputLabel: 'PDF' },

  // ---- Convert from PDF ----
  { slug: 'pdf-to-jpg', name: 'PDF to JPG', desc: 'Convert each PDF page into a JPG image', category: 'convert-from', color: '#FF8E00', icon: 'image', status: 'ready', accept: '.pdf', inputLabel: 'PDF' },
  { slug: 'pdf-to-png', name: 'PDF to PNG', desc: 'Convert each PDF page into a PNG image', category: 'convert-from', color: '#FF8E00', icon: 'image', status: 'ready', accept: '.pdf', inputLabel: 'PDF' },
  { slug: 'pdf-to-excel', name: 'PDF to Excel', desc: 'Extract tables from PDFs into Excel spreadsheets', category: 'convert-from', color: '#00D267', icon: 'file-spreadsheet', status: 'soon', accept: '.pdf', inputLabel: 'PDF' },
  { slug: 'pdf-to-ppt', name: 'PDF to PPT', desc: 'Turn PDF pages into PowerPoint slides', category: 'convert-from', color: '#FF8E00', icon: 'presentation', status: 'soon', accept: '.pdf', inputLabel: 'PDF' },
  { slug: 'pdf-ocr', name: 'PDF OCR', desc: 'Make scanned PDFs searchable and selectable', category: 'convert-from', color: '#FF5400', icon: 'scan-text', status: 'soon', accept: '.pdf', inputLabel: 'PDF' },

  // ---- Convert to PDF ----
  { slug: 'word-to-pdf', name: 'Word to PDF', desc: 'Convert Word documents to PDF', category: 'convert-to', color: '#2B8FE3', icon: 'file-word', status: 'soon', accept: '.doc,.docx', inputLabel: 'Word' },
  { slug: 'excel-to-pdf', name: 'Excel to PDF', desc: 'Convert Excel spreadsheets to PDF', category: 'convert-to', color: '#00D267', icon: 'file-spreadsheet', status: 'soon', accept: '.xls,.xlsx', inputLabel: 'Excel' },
  { slug: 'ppt-to-pdf', name: 'PPT to PDF', desc: 'Convert PowerPoint presentations to PDF', category: 'convert-to', color: '#FF8E00', icon: 'presentation', status: 'soon', accept: '.ppt,.pptx', inputLabel: 'PPT' },
  { slug: 'png-to-pdf', name: 'PNG to PDF', desc: 'Convert PNG images to a PDF document', category: 'convert-to', color: '#FF8E00', icon: 'image', status: 'ready', accept: 'image/png', multi: true, inputLabel: 'PNG' },

  // ---- Organize ----
  { slug: 'split-pdf', name: 'Split PDF', desc: 'Extract pages or split a PDF into separate files', category: 'organize', color: '#8B48FE', icon: 'split', status: 'ready', accept: '.pdf', inputLabel: 'PDF' },
  { slug: 'rotate-pdf', name: 'Rotate PDF', desc: 'Rotate PDF pages 90°, 180° or 270°', category: 'organize', color: '#8B48FE', icon: 'rotate', status: 'ready', accept: '.pdf', inputLabel: 'PDF' },
  { slug: 'organize-pdf', name: 'Organize PDF', desc: 'Reorder, rotate and delete pages visually', category: 'organize', color: '#8B48FE', icon: 'layout-grid', status: 'ready', accept: '.pdf', inputLabel: 'PDF' },
  { slug: 'delete-pdf-pages', name: 'Delete PDF Pages', desc: 'Remove unwanted pages from a PDF', category: 'organize', color: '#8B48FE', icon: 'trash', status: 'ready', accept: '.pdf', inputLabel: 'PDF' },
  { slug: 'extract-pdf-pages', name: 'Extract PDF Pages', desc: 'Pull selected pages into a new PDF', category: 'organize', color: '#8B48FE', icon: 'copy', status: 'ready', accept: '.pdf', inputLabel: 'PDF' },

  // ---- Edit / modify ----
  { slug: 'watermark-pdf', name: 'Watermark PDF', desc: 'Stamp text over your PDF pages', category: 'edit', color: '#00C0FF', icon: 'stamp', status: 'ready', accept: '.pdf', inputLabel: 'PDF' },
  { slug: 'number-pages', name: 'Number Pages', desc: 'Add page numbers to a PDF', category: 'edit', color: '#00D267', icon: 'hash', status: 'ready', accept: '.pdf', inputLabel: 'PDF' },
  { slug: 'crop-pdf', name: 'Crop PDF', desc: 'Trim unwanted margins from your PDF pages', category: 'edit', color: '#00D267', icon: 'crop', status: 'ready', accept: '.pdf', inputLabel: 'PDF' },
  { slug: 'pdf-reader', name: 'PDF Reader', desc: 'Read and view your PDF in the browser', category: 'edit', color: '#00D267', icon: 'book-open', status: 'ready', accept: '.pdf', inputLabel: 'PDF' },

  // ---- Protect ----
  { slug: 'protect-pdf', name: 'Protect PDF', desc: 'Add a password and encrypt your PDF', category: 'protect', color: '#FF46FB', icon: 'lock', status: 'soon', accept: '.pdf', inputLabel: 'PDF' },
  { slug: 'unlock-pdf', name: 'Unlock PDF', desc: 'Remove a password from a PDF', category: 'protect', color: '#FF46FB', icon: 'unlock', status: 'soon', accept: '.pdf', inputLabel: 'PDF' },
  { slug: 'flatten-pdf', name: 'Flatten PDF', desc: 'Merge layers and annotations into one', category: 'protect', color: '#FF46FB', icon: 'layers', status: 'soon', accept: '.pdf', inputLabel: 'PDF' },

  // ---- AI ----
  { slug: 'ai-summarizer', name: 'AI PDF Summarizer', desc: 'Summarize long PDFs in seconds', category: 'ai', color: '#0055FF', icon: 'sparkles', status: 'soon', accept: '.pdf', inputLabel: 'PDF' },
  { slug: 'translate-pdf', name: 'Translate PDF', desc: 'Translate PDF documents to another language', category: 'ai', color: '#0055FF', icon: 'languages', status: 'soon', accept: '.pdf', inputLabel: 'PDF' },
]

export const POPULAR = TOOLS.filter((t) => t.category === 'popular')

// Tools that run on the server API (enabled when VITE_API_URL is configured).
const SERVER_SLUGS = ['pdf-to-word', 'pdf-ocr', 'word-to-pdf', 'excel-to-pdf', 'ppt-to-pdf', 'protect-pdf', 'unlock-pdf']
for (const t of TOOLS) {
  if (SERVER_SLUGS.includes(t.slug)) {
    t.server = true
    t.status = 'ready'
  }
}

export const DIRECTORY: { title: string; slugs: string[] }[] = [
  { title: 'Convert from PDF', slugs: ['pdf-to-word', 'pdf-to-excel', 'pdf-to-ppt', 'pdf-to-jpg', 'pdf-to-png', 'pdf-ocr'] },
  { title: 'Convert to PDF', slugs: ['word-to-pdf', 'excel-to-pdf', 'ppt-to-pdf', 'jpg-to-pdf', 'png-to-pdf'] },
  { title: 'Organize PDF', slugs: ['merge-pdf', 'split-pdf', 'rotate-pdf', 'organize-pdf', 'delete-pdf-pages', 'extract-pdf-pages'] },
  { title: 'Edit PDF', slugs: ['edit-pdf', 'sign-pdf', 'watermark-pdf', 'number-pages', 'crop-pdf', 'pdf-reader'] },
  { title: 'Protect PDF', slugs: ['protect-pdf', 'unlock-pdf', 'flatten-pdf'] },
  { title: 'AI PDF', slugs: ['ai-summarizer', 'translate-pdf'] },
  { title: 'Optimize', slugs: ['compress-pdf'] },
]

export function getTool(slug: string): Tool | undefined {
  return TOOLS.find((t) => t.slug === slug)
}

export const CATEGORY_LABEL: Record<ToolCategory, string> = {
  popular: 'Most Popular',
  'convert-from': 'Convert from PDF',
  'convert-to': 'Convert to PDF',
  organize: 'Organize PDF',
  edit: 'Edit PDF',
  protect: 'Protect PDF',
  ai: 'AI PDF',
}
