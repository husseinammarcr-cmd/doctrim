const GRID = [
  '#FF5400', '#FF8E00', '#FFD200',
  '#00C0FF', '#00D267', '#81E650',
  '#8B48FE', '#CA41FC', '#FF46FB',
]

export function LogoMark({ size = 28 }: { size?: number }) {
  const cell = size / 3.6
  const gap = (size - cell * 3) / 2
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      {GRID.map((c, i) => {
        const row = Math.floor(i / 3)
        const col = i % 3
        return (
          <rect
            key={i}
            x={col * (cell + gap)}
            y={row * (cell + gap)}
            width={cell}
            height={cell}
            rx={cell * 0.24}
            fill={c}
          />
        )
      })}
    </svg>
  )
}

export default function Logo({ size = 28, textClass = 'text-[22px]' }: { size?: number; textClass?: string }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={size} />
      <span className={`font-bold tracking-tight text-ink leading-none ${textClass}`}>
        DocTrim
      </span>
    </span>
  )
}
