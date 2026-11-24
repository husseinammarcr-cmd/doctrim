const MINI = [
  '#FF5400', '#FF8E00', '#FFD200',
  '#00C0FF', '#00D267', '#81E650',
  '#8B48FE', '#CA41FC', '#FF46FB',
]

function MiniLogo({ x, y, s = 15 }: { x: number; y: number; s?: number }) {
  const c = s / 3.4
  const g = (s - c * 3) / 2
  return (
    <g>
      {MINI.map((col, i) => (
        <rect
          key={i}
          x={x + (i % 3) * (c + g)}
          y={y + Math.floor(i / 3) * (c + g)}
          width={c}
          height={c}
          rx={c * 0.25}
          fill={col}
        />
      ))}
    </g>
  )
}

function FloatIcon({ x, y, color, children }: { x: number; y: number; color: string; children: React.ReactNode }) {
  return (
    <g>
      <rect x={x} y={y} width={46} height={46} rx={10} fill={color} />
      <g transform={`translate(${x + 23},${y + 23})`} stroke="#fff" strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </g>
    </g>
  )
}

function Handles({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const pts = [
    [x, y], [x + w / 2, y], [x + w, y],
    [x, y + h / 2], [x + w, y + h / 2],
    [x, y + h], [x + w / 2, y + h], [x + w, y + h],
  ]
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill="none" stroke="#0055FF" strokeWidth={1.4} />
      {pts.map(([px, py], i) => (
        <rect key={i} x={px - 3} y={py - 3} width={6} height={6} fill="#fff" stroke="#0055FF" strokeWidth={1.2} />
      ))}
    </g>
  )
}

export default function HeroIllustration({ ar = false }: { ar?: boolean }) {
  return (
    <svg
      viewBox="0 0 640 530"
      className="h-auto w-full"
      role="img"
      aria-label={ar ? 'معاينة محرر PDF من DocTrim' : 'DocTrim PDF editor preview'}
      style={{ direction: 'ltr' }}
    >
      {/* tilted backdrop shapes */}
      <rect x={200} y={40} width={235} height={235} rx={14} fill="#F2F6FF" transform="rotate(-112 317 157)" />
      <rect x={60} y={260} width={170} height={170} rx={14} fill="#F2F6FF" transform="rotate(70 145 345)" />
      <rect x={330} y={60} width={168} height={168} rx={14} fill="#E5EEFF" transform="rotate(-127 414 144)" />

      {/* editor window */}
      <g>
        <rect x={110} y={150} width={420} height={300} rx={6} fill="#fff" stroke="#E8E8E8" />
        {/* header */}
        <rect x={110} y={150} width={420} height={34} rx={6} fill="#fff" />
        <line x1={110} y1={184} x2={530} y2={184} stroke="#EFEFEF" />
        <MiniLogo x={126} y={160} s={15} />
        <text x={148} y={172} fontFamily="Source Sans 3, sans-serif" fontSize={13} fontWeight={700} fill="#1A1A1A">DocTrim</text>
        {/* toolbar glyphs */}
        <rect x={110} y={184} width={420} height={30} fill="#FAFAFA" />
        <line x1={110} y1={214} x2={530} y2={214} stroke="#EFEFEF" />
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <rect key={i} x={126 + i * 26} y={192} width={14} height={14} rx={3} fill="#D9D9DE" />
        ))}
        {/* canvas */}
        <rect x={110} y={214} width={420} height={236} fill="#F4F5F7" />
        {/* page */}
        <rect x={185} y={232} width={270} height={200} rx={2} fill="#fff" stroke="#E8E8E8" />
        {/* placeholder text lines */}
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={205} y={252 + i * 16} width={i === 3 ? 150 : 230} height={7} rx={3.5} fill="#E3E3E8" />
        ))}
        {/* image placeholder */}
        <rect x={205} y={330} width={110} height={70} rx={4} fill="#EEF1F5" />
        <circle cx={232} cy={352} r={9} fill="#D9D9DE" />
        <path d="M212 392 l24 -22 18 14 22 -26 26 34z" fill="#D9D9DE" />
        {[0, 1].map((i) => (
          <rect key={i} x={330} y={338 + i * 16} width={105} height={7} rx={3.5} fill="#E3E3E8" />
        ))}
        {/* blue selected circle */}
        <circle cx={395} cy={285} r={24} fill="#0055FF" opacity={0.9} />
        <Handles x={369} y={261} w={52} h={52} />
        {/* Hello text box */}
        <rect x={225} y={300} width={70} height={24} rx={3} fill="#fff" stroke="#0055FF" strokeWidth={1.2} />
        {ar ? (
          <text
            x={260}
            y={316}
            textAnchor="middle"
            fontFamily="Noto Sans Arabic, Source Sans 3, sans-serif"
            fontSize={12}
            fontWeight={600}
            fill="#1A1A1A"
          >
            مرحباً
          </text>
        ) : (
          <text x={236} y={316} fontFamily="Source Sans 3, sans-serif" fontSize={13} fontWeight={600} fill="#1A1A1A">Hello!</text>
        )}
        {/* red scribble */}
        <path d="M330 405 q14 -18 28 0 t28 0 t28 0" fill="none" stroke="#FF5400" strokeWidth={2.4} strokeLinecap="round" />
      </g>

      {/* floating tool icons */}
      <FloatIcon x={250} y={92} color="#00C0FF">
        <path d="M-8 6 L6 -8 l4 4 -14 14 -5 1z" />
      </FloatIcon>
      <FloatIcon x={470} y={110} color="#8B48FE">
        <rect x={-8} y={-8} width={16} height={16} rx={2} />
        <path d="M-8 -2 h16 M-2 -8 v16" />
      </FloatIcon>
      <FloatIcon x={62} y={230} color="#FF46FB">
        <path d="M0 -9 L6 3 L0 9 L-6 3z" />
        <circle cx={0} cy={0} r={2} />
      </FloatIcon>
      <FloatIcon x={548} y={250} color="#FFD200">
        <rect x={-8} y={-7} width={16} height={14} rx={2} />
        <circle cx={-3} cy={-2} r={2} />
        <path d="M-8 5 l5 -5 4 3 4 -5 3 4" />
      </FloatIcon>
      <FloatIcon x={500} y={395} color="#2B8FE3">
        <text x={0} y={6} textAnchor="middle" fontFamily="Source Sans 3, sans-serif" fontSize={18} fontWeight={700} fill="#fff" stroke="none">W</text>
      </FloatIcon>
      <FloatIcon x={120} y={455} color="#FF5400">
        <path d="M-6 -8 h9 l4 4 v12 h-13z" />
        <path d="M3 -8 v4 h4" />
      </FloatIcon>

      {/* confetti */}
      <g stroke="#FFD200" strokeWidth={2.4} strokeLinecap="round">
        <path d="M150 120 v14 M143 127 h14" />
      </g>
      <circle cx={560} cy={180} r={7} fill="none" stroke="#FF5400" strokeWidth={2.4} />
      <circle cx={90} cy={340} r={6} fill="none" stroke="#00C0FF" strokeWidth={2.4} />
      <g stroke="#00D267" strokeWidth={2.4} strokeLinecap="round">
        <path d="M585 320 l10 10 M595 320 l-10 10" />
      </g>
      <g stroke="#FF46FB" strokeWidth={2.4} strokeLinecap="round">
        <path d="M200 500 l9 9 M209 500 l-9 9" />
      </g>

      {/* cursor arrow — glides to the "Hello!" text, clicks it, returns */}
      <g transform="translate(455,430)">
        <g className="dt-cursor-move">
          <g className="dt-cursor-press">
            <path d="M0 0 L0 30 L8 22 L13 34 L18 32 L13 20 L23 20z" fill="#1A1A1A" stroke="#fff" strokeWidth={1.6} />
          </g>
          <circle className="dt-click-ring" cx={2} cy={2} r={9} fill="none" stroke="#0055FF" strokeWidth={1.6} aria-hidden="true" />
        </g>
      </g>
    </svg>
  )
}
