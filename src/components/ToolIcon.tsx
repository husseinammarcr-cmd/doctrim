import {
  FileText, Image, PenLine, Pencil, Minimize2, FileSpreadsheet,
  Presentation, ScanText, Scissors, RotateCw, LayoutGrid, Trash2,
  Copy, Stamp, Hash, Crop, BookOpen, Lock, Unlock, Layers,
  Sparkles, Languages, GitMerge, type LucideIcon,
} from 'lucide-react'

const MAP: Record<string, LucideIcon> = {
  'file-word': FileText,
  merge: GitMerge,
  image: Image,
  pen: PenLine,
  edit: Pencil,
  compress: Minimize2,
  'file-spreadsheet': FileSpreadsheet,
  presentation: Presentation,
  'scan-text': ScanText,
  split: Scissors,
  rotate: RotateCw,
  'layout-grid': LayoutGrid,
  trash: Trash2,
  copy: Copy,
  stamp: Stamp,
  hash: Hash,
  crop: Crop,
  'book-open': BookOpen,
  lock: Lock,
  unlock: Unlock,
  layers: Layers,
  sparkles: Sparkles,
  languages: Languages,
}

export default function ToolIcon({
  icon,
  color,
  size = 40,
  radius = 10,
}: {
  icon: string
  color: string
  size?: number
  radius?: number
}) {
  const Icon = MAP[icon] ?? FileText
  const glyph = Math.round(size * 0.52)
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size, backgroundColor: color, borderRadius: radius }}
    >
      <Icon size={glyph} color="#fff" strokeWidth={2} />
    </span>
  )
}
