import { Link } from 'react-router-dom'
import { ATTR_KEYS, type Attributes } from '../types'
import { ATTR_LABELS } from '../lib/constants'
import { attrColor, formatShortDate, ratingColor } from '../lib/utils'
import type { PlayerSummary } from '../lib/stats'

/** Sofascore tarzı beşgen radar grafiği */
export function RadarChart({ attrs, size = 260 }: { attrs: Attributes | null; size?: number }) {
  const c = size / 2
  const R = size * 0.32
  const n = ATTR_KEYS.length
  const point = (i: number, r: number) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n
    return [c + Math.cos(a) * r, c + Math.sin(a) * r] as const
  }
  const ring = (f: number) => ATTR_KEYS.map((_, i) => point(i, R * f).join(',')).join(' ')
  const shape = attrs ? ATTR_KEYS.map((k, i) => point(i, (R * attrs[k]) / 100).join(',')).join(' ') : ''

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[280px]" role="img" aria-label="Oyuncu özellikleri">
      {[1, 0.75, 0.5, 0.25].map((f) => (
        <polygon key={f} points={ring(f)} fill={f === 1 ? '#1c2433' : 'none'} stroke="#2e3a52" strokeWidth={1} />
      ))}
      {ATTR_KEYS.map((_, i) => {
        const [x, y] = point(i, R)
        return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="#2e3a52" strokeWidth={1} />
      })}
      {attrs && <polygon points={shape} fill="rgba(34,197,94,.35)" stroke="#22c55e" strokeWidth={2} strokeLinejoin="round" />}
      {ATTR_KEYS.map((k, i) => {
        const [x, y] = point(i, R + 30)
        const v = attrs?.[k]
        return (
          <g key={k} transform={`translate(${x},${y})`}>
            <text textAnchor="middle" y={-4} fontSize={11} fontWeight={600} fill="#8b95a8">
              {ATTR_LABELS[k].short}
            </text>
            <rect x={-14} y={2} width={28} height={18} rx={4} fill={v != null ? attrColor(v) : '#263044'} />
            <text textAnchor="middle" y={15} fontSize={11} fontWeight={700} fill="#fff">
              {v ?? '–'}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

/** Son maçlardaki rating çizgisi (Sofascore'daki form grafiği gibi) */
export function FormChart({ form }: { form: PlayerSummary['form'] }) {
  const items = form.slice(-6)
  if (!items.length) return <p className="py-6 text-center text-sm text-muted">Henüz bitmiş maç yok.</p>
  const H = 110
  const y = (r: number) => H - 14 - ((Math.max(5, Math.min(10, r)) - 5) / 5) * (H - 40)
  const xs = items.map((_, i) => ((i + 0.5) / items.length) * 100)
  const pts = items.map((f, i) => (f.rating != null ? `${xs[i]},${y(f.rating)}` : null)).filter(Boolean)
  return (
    <div>
      <div className="flex">
        {items.map((f) => (
          <Link key={f.match.id} to={`/mac/${f.match.id}`} className="flex flex-1 flex-col items-center gap-1 text-[11px] text-muted">
            <span>{formatShortDate(f.match.date)}</span>
            <span
              className={`grid h-5 w-5 place-items-center rounded text-[10px] font-bold text-white ${
                f.result === 'G' ? 'bg-green-600' : f.result === 'B' ? 'bg-slate-500' : 'bg-red-600'
              }`}
            >
              {f.result}
            </span>
          </Link>
        ))}
      </div>
      <div className="relative mt-1" style={{ height: H }}>
        <svg viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          <polyline points={pts.join(' ')} fill="none" stroke="#22c55e" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
        </svg>
        {items.map((f, i) =>
          f.rating != null ? (
            <span
              key={f.match.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-md px-1.5 py-0.5 text-xs font-bold text-white shadow"
              style={{ left: `${xs[i]}%`, top: y(f.rating), background: ratingColor(f.rating) }}
            >
              {f.rating.toFixed(1)}
            </span>
          ) : (
            <span key={f.match.id} className="absolute -translate-x-1/2 -translate-y-1/2 text-[10px] text-muted" style={{ left: `${xs[i]}%`, top: H / 2 }}>
              oylama
            </span>
          ),
        )}
      </div>
    </div>
  )
}

export function AttrBars({ attrs }: { attrs: Attributes | null }) {
  return (
    <div className="space-y-2.5">
      {ATTR_KEYS.map((k) => {
        const v = attrs?.[k]
        return (
          <div key={k} className="flex items-center gap-3 text-sm">
            <span className="w-32 shrink-0 text-muted">{ATTR_LABELS[k].long}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
              {v != null && <div className="h-full rounded-full" style={{ width: `${v}%`, background: attrColor(v) }} />}
            </div>
            <span className="w-7 text-right font-bold tabular-nums">{v ?? '–'}</span>
          </div>
        )
      })}
    </div>
  )
}
