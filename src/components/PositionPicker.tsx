import { POSITION_LABELS, POSITIONS } from '../lib/constants'
import type { Position } from '../types'

/** Ana mevki + isteğe bağlı yan mevki: iki sıra seçim */
export default function PositionPicker({
  position,
  position2,
  onChange,
}: {
  position: Position
  position2?: Position
  onChange: (v: { position: Position; position2?: Position }) => void
}) {
  const btn = 'flex h-12 flex-col items-center justify-center rounded-xl border text-center transition'
  return (
    <div className="space-y-3">
      <div>
        <div className="label">Ana mevki</div>
        <div className="grid grid-cols-4 gap-1.5">
          {POSITIONS.map((p) => {
            const on = position === p
            return (
              <button
                type="button"
                key={p}
                aria-pressed={on}
                onClick={() => onChange({ position: p, position2: position2 === p ? undefined : position2 })}
                className={`${btn} ${on ? 'border-brand bg-brand text-white' : 'border-line bg-surface hover:bg-surface-2'}`}
              >
                <span className="text-[13px] font-extrabold">{p}</span>
                <span className="text-[10px] opacity-80">{POSITION_LABELS[p]}</span>
              </button>
            )
          })}
        </div>
      </div>
      <div>
        <div className="label">
          Yan mevki <span className="font-normal text-muted">(isteğe bağlı)</span>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {POSITIONS.map((p) => {
            const isMain = position === p
            const on = position2 === p
            return (
              <button
                type="button"
                key={p}
                aria-pressed={on}
                disabled={isMain}
                onClick={() => onChange({ position, position2: on ? undefined : p })}
                className={`${btn} ${on ? 'border-brand bg-brand/10 text-brand' : 'border-line bg-surface hover:bg-surface-2'} disabled:cursor-not-allowed disabled:opacity-40`}
              >
                <span className="text-[13px] font-extrabold">{p}</span>
                <span className="text-[10px] opacity-80">{isMain ? 'ana mevki' : POSITION_LABELS[p]}</span>
              </button>
            )
          })}
          <button
            type="button"
            aria-pressed={!position2}
            onClick={() => onChange({ position, position2: undefined })}
            className={`${btn} ${!position2 ? 'border-brand bg-brand/10 text-brand' : 'border-line bg-surface hover:bg-surface-2'}`}
          >
            <span className="text-[13px] font-extrabold">—</span>
            <span className="text-[10px] opacity-80">Yok</span>
          </button>
        </div>
      </div>
    </div>
  )
}
