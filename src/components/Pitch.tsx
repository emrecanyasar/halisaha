import { useEffect, useRef, useState, type PointerEvent as RPointerEvent, type RefObject } from 'react'
import type { Match, PitchPos, Player, TeamSide } from '../types'
import { clamp, initials, ratingColor } from '../lib/utils'
import { dropTargetOf, slotPos } from '../lib/pitch'

interface Props {
  match: Match
  players: Map<string, Player>
  ratings?: Map<string, { rating: number }>
  mvpId?: string | null
  editable?: boolean
  onSlotClick?: (side: TeamSide, index: number) => void
  /** Oyuncu sürüklenip bırakıldığında yeni konum (saha yüzdesi) */
  onMove?: (side: TeamSide, index: number, pos: PitchPos) => void
  goalsBy?: Map<string, number>
  /** Dışarıdan (kadro listesinden) bırakma hesabı için sahanın DOM referansı */
  pitchRef?: RefObject<HTMLDivElement | null>
  /** Masaüstü: saha ekran yüksekliğine sığacak kadar büyür */
  fit?: boolean
  /** Bırakma sırasında sahayı vurgula */
  highlight?: boolean
}

/** Ekran koordinatını saha yüzdesine çevirir */
export const toPitchPercent = (el: HTMLElement, clientX: number, clientY: number): PitchPos => {
  const r = el.getBoundingClientRect()
  return {
    x: clamp(((clientX - r.left) / r.width) * 100, 5, 95),
    y: clamp(((clientY - r.top) / r.height) * 100, 4, 96),
  }
}

/** Sahadaki etiket: kısa isimler tam ("Emre Can", "H. Turan"), uzunlarda ilk kelime */
const shortName = (name: string) => (name.length <= 10 ? name : name.split(' ')[0]!)

const DRAG_THRESHOLD = 6 // px: bundan az hareket "dokunma" sayılır

interface DragState {
  key: string
  side: TeamSide
  index: number
  startX: number
  startY: number
  moved: boolean
  pos: PitchPos
}

export default function Pitch({ match, players, ratings, mvpId, editable, onSlotClick, onMove, goalsBy, pitchRef, fit, highlight }: Props) {
  const innerRef = useRef<HTMLDivElement>(null)
  const ref = pitchRef ?? innerRef
  const [drag, setDrag] = useState<DragState | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  useEffect(() => {
    if (!hint) return
    const t = window.setTimeout(() => setHint(null), 2200)
    return () => window.clearTimeout(t)
  }, [hint])
  const sides: TeamSide[] = ['B', 'A']
  // Sürüklerken bırakılınca etkilenecek yer (yer değiştirilecek oyuncu ya da geçilecek boş yer)
  const target = drag?.moved ? dropTargetOf(match, drag.side, drag.index, drag.pos) : null
  const targetKey = target && (target.kind === 'swap' || target.kind === 'empty') ? `${target.side}-${target.index}` : null
  const crossing = !!target && target.kind === 'none'

  const toPercent = (clientX: number, clientY: number): PitchPos => toPitchPercent(ref.current!, clientX, clientY)

  // Sürükleme durumu ref'te tutulur: hızlı dokunuşlarda React yeniden çizmeden pointerup gelebilir
  const dragRef = useRef<DragState | null>(null)
  const update = (d: DragState | null) => {
    dragRef.current = d
    setDrag(d)
  }

  const onDown = (e: RPointerEvent, side: TeamSide, index: number, current: PitchPos, filled: boolean) => {
    if (!editable) return
    if (!filled) {
      // Boş yerler sürüklenmez, dokununca seçim açılır
      update({ key: `${side}-${index}`, side, index, startX: e.clientX, startY: e.clientY, moved: false, pos: current })
      return
    }
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
    update({ key: `${side}-${index}`, side, index, startX: e.clientX, startY: e.clientY, moved: false, pos: current })
  }
  const onPointerMove = (e: RPointerEvent) => {
    const d = dragRef.current
    if (!d) return
    const team = d.side === 'A' ? match.teamA : match.teamB
    if (!team.slots[d.index]) return
    const moved = d.moved || Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > DRAG_THRESHOLD
    if (!moved) return
    update({ ...d, moved, pos: toPercent(e.clientX, e.clientY) })
  }
  const onUp = () => {
    const d = dragRef.current
    if (!d) return
    const round = (n: number) => Math.round(n * 10) / 10
    if (d.moved) {
      const pos = { x: round(d.pos.x), y: round(d.pos.y) }
      if (dropTargetOf(match, d.side, d.index, pos).kind === 'none') setHint('Takım değiştirmek için bir oyuncunun üstüne bırak')
      else onMove?.(d.side, d.index, pos)
    }
    else onSlotClick?.(d.side, d.index)
    update(null)
  }

  return (
    <div
      ref={ref}
      className={`relative mx-auto aspect-[68/105] overflow-hidden rounded-2xl border select-none transition-shadow [container-type:inline-size] ${
        fit ? 'max-w-full' : 'w-full max-w-md'
      } ${highlight ? 'border-brand shadow-[0_0_0_4px_rgba(22,163,74,.25)]' : 'border-line'}`}
      style={{
        background: 'repeating-linear-gradient(0deg, #15803d 0 10%, #166534 10% 20%)',
        ...(fit ? { height: 'max(520px, calc(100vh - 10rem))' } : {}),
      }}
    >
      <PitchLines />
      {sides.map((side) => {
        const team = side === 'A' ? match.teamA : match.teamB
        return team.slots.map((pid, i) => {
          const key = `${side}-${i}`
          const p = pid ? players.get(pid) : undefined
          const r = pid ? ratings?.get(pid)?.rating : undefined
          const g = pid ? goalsBy?.get(pid) ?? 0 : 0
          const base = slotPos(team, side, i)
          const dragging = drag?.key === key && drag.moved
          const isTarget = targetKey === key
          const at = dragging ? drag.pos : base
          return (
            <div
              key={key}
              role={editable ? 'button' : undefined}
              tabIndex={editable ? 0 : undefined}
              aria-label={p ? p.name : 'Boş yer'}
              onPointerDown={(e) => onDown(e, side, i, base, !!pid)}
              onPointerMove={onPointerMove}
              onPointerUp={onUp}
              onPointerCancel={() => update(null)}
              onKeyDown={(e) => editable && (e.key === 'Enter' || e.key === ' ') && onSlotClick?.(side, i)}
              className={`absolute flex w-[clamp(64px,20cqw,96px)] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5 ${
                editable ? 'cursor-grab touch-none active:cursor-grabbing' : ''
              } ${dragging ? 'z-20 scale-110' : 'z-10 transition-[left,top] duration-200'}`}
              style={{ left: `${at.x}%`, top: `${at.y}%` }}
            >
              <span className="relative">
                {p ? (
                  <span
                    className={`grid size-[clamp(36px,9.5cqw,52px)] place-items-center rounded-full border-2 border-white/90 text-[clamp(13px,3.6cqw,18px)] font-bold shadow-lg transition-transform ${dragging ? 'ring-4 ring-white/40' : ''} ${isTarget ? 'scale-110 ring-4 ring-amber-300' : ''} ${dragging && crossing ? 'opacity-60' : ''}`}
                    style={{ background: team.color, color: team.color === '#f8fafc' ? '#111' : '#fff' }}
                  >
                    {p.number || initials(p.name)}
                  </span>
                ) : (
                  <span className={`grid size-[clamp(36px,9.5cqw,52px)] place-items-center rounded-full border-2 border-dashed text-lg text-white/80 ${isTarget ? 'scale-110 border-amber-300 bg-amber-300/30' : 'border-white/60'} ${editable ? 'bg-black/20 hover:bg-black/40' : 'bg-black/10'}`}>
                    +
                  </span>
                )}
                {r != null && (
                  <span className="absolute -right-4 -top-1.5 rounded px-1 text-[10px] font-bold leading-4 text-white shadow" style={{ background: ratingColor(r) }}>
                    {r.toFixed(1)}
                  </span>
                )}
                {mvpId && pid === mvpId && (
                  <span className="absolute -left-3 -top-1.5 text-sm drop-shadow" title="Maçın oyuncusu">⭐</span>
                )}
                {g > 0 && (
                  <span className="absolute -bottom-1 -right-2.5 rounded-full bg-white px-1 text-[9px] font-bold leading-4 text-black shadow">
                    ⚽{g > 1 ? g : ''}
                  </span>
                )}
              </span>
              <span className="max-w-full truncate rounded bg-black/45 px-1.5 text-[clamp(11px,2.9cqw,14px)] font-semibold leading-[1.4] text-white">
                {p ? shortName(p.name) : editable ? 'Ekle' : 'Boş'}
              </span>
            </div>
          )
        })
      })}
      {(hint || (drag?.moved && target && target.kind !== 'move')) && (
        <span className="pointer-events-none absolute inset-x-0 top-1/2 z-30 flex -translate-y-1/2 justify-center px-3">
          <span className="rounded-full bg-black/70 px-3 py-1.5 text-center text-xs font-semibold text-white shadow-lg">
            {hint ??
              (target!.kind === 'swap'
                ? `${players.get((target!.side === 'A' ? match.teamA : match.teamB).slots[target!.index]!)?.name ?? 'Oyuncu'} ile yer değiştir`
                : target!.kind === 'empty'
                  ? `${(target!.side === 'A' ? match.teamA : match.teamB).name} takımına geç`
                  : target!.kind === 'none'
                    ? 'Bir oyuncunun üstüne bırak'
                    : '')}
          </span>
        </span>
      )}
      <TeamTag name={match.teamB.name} color={match.teamB.color} pos="top" />
      <TeamTag name={match.teamA.name} color={match.teamA.color} pos="bottom" />
    </div>
  )
}

function TeamTag({ name, color, pos }: { name: string; color: string; pos: 'top' | 'bottom' }) {
  return (
    <span className={`pointer-events-none absolute left-2 ${pos === 'top' ? 'top-2' : 'bottom-2'} flex items-center gap-1.5 rounded-full bg-black/40 px-2 py-0.5 text-[11px] font-semibold text-white`}>
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {name}
    </span>
  )
}

function PitchLines() {
  return (
    <svg viewBox="0 0 68 105" className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden>
      <g fill="none" stroke="rgba(255,255,255,.55)" strokeWidth=".4">
        <rect x="2" y="2" width="64" height="101" />
        <line x1="2" y1="52.5" x2="66" y2="52.5" />
        <circle cx="34" cy="52.5" r="9.15" />
        <rect x="13.85" y="2" width="40.3" height="16.5" />
        <rect x="24.85" y="2" width="18.3" height="5.5" />
        <rect x="13.85" y="86.5" width="40.3" height="16.5" />
        <rect x="24.85" y="97.5" width="18.3" height="5.5" />
        <path d="M26.7 18.5 a9.15 9.15 0 0 0 14.6 0" />
        <path d="M26.7 86.5 a9.15 9.15 0 0 1 14.6 0" />
      </g>
      <g fill="rgba(255,255,255,.6)">
        <circle cx="34" cy="52.5" r=".6" />
        <circle cx="34" cy="13" r=".5" />
        <circle cx="34" cy="92" r=".5" />
      </g>
    </svg>
  )
}
