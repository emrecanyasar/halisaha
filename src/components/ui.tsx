import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Player } from '../types'
import { initials, ratingColor } from '../lib/utils'

export function RatingBadge({ value, size = 'md' }: { value: number | null | undefined; size?: 'sm' | 'md' | 'lg' }) {
  const cls = size === 'lg' ? 'h-10 min-w-12 text-lg px-2' : size === 'sm' ? 'h-5 min-w-7 text-[11px] px-1' : 'h-7 min-w-9 text-sm px-1.5'
  if (value == null)
    return <span className={`${cls} inline-flex items-center justify-center rounded-md bg-surface-2 text-muted font-bold`}>–</span>
  return (
    <span
      className={`${cls} inline-flex items-center justify-center rounded-md font-bold text-white tabular-nums`}
      style={{ background: ratingColor(value) }}
    >
      {value.toFixed(1)}
    </span>
  )
}

export function Avatar({ player, size = 40, color }: { player: Pick<Player, 'name' | 'number'> | undefined; size?: number; color?: string }) {
  const bg = color ?? '#334155'
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white ring-2 ring-black/5"
      style={{ width: size, height: size, background: `linear-gradient(135deg, ${bg}, ${bg}aa)`, fontSize: size * 0.38 }}
    >
      {player ? initials(player.name) : '?'}
    </span>
  )
}

export function PageHeader({ title, back = true, right }: { title: string; back?: boolean; right?: ReactNode }) {
  const nav = useNavigate()
  return (
    <div className="flex items-center gap-2 px-4 pt-4 pb-3">
      {back && (
        <button onClick={() => nav(-1)} className="-ml-2 rounded-full p-2 hover:bg-surface-2" aria-label="Geri">
          <Icon name="back" />
        </button>
      )}
      <h1 className="flex-1 truncate text-lg font-bold">{title}</h1>
      {right}
    </div>
  )
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string; badge?: ReactNode }[]; value: T; onChange: (t: T) => void }) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-line px-2">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`relative flex shrink-0 items-center gap-1.5 px-3 py-3 text-sm font-semibold transition ${
            value === t.id ? 'text-ink' : 'text-muted hover:text-ink'
          }`}
        >
          {t.label}
          {t.badge}
          {value === t.id && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand" />}
        </button>
      ))}
    </div>
  )
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal>
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[85vh] w-full max-w-lg overflow-hidden rounded-t-3xl border border-line bg-surface sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-bold">{title}</h2>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-surface-2" aria-label="Kapat">
            <Icon name="close" />
          </button>
        </div>
        <div className="max-h-[calc(85vh-60px)] overflow-y-auto p-3 pb-8">{children}</div>
      </div>
    </div>
  )
}

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-10 text-center">
      <div className="text-3xl">⚽</div>
      <div className="font-semibold">{title}</div>
      {text && <p className="text-sm text-muted">{text}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-base font-bold tabular-nums">{value}</span>
      <span className="text-[11px] text-muted">{label}</span>
    </div>
  )
}

const PATHS: Record<string, string> = {
  back: 'M15 18l-6-6 6-6',
  close: 'M18 6L6 18M6 6l12 12',
  plus: 'M12 5v14M5 12h14',
  ball: 'M12 2a10 10 0 100 20 10 10 0 000-20zm0 4l3.5 2.5-1.3 4h-4.4l-1.3-4L12 6z',
  users: 'M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
  settings: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z',
  lock: 'M5 11h14v10H5zM8 11V7a4 4 0 118 0v4',
  check: 'M20 6L9 17l-5-5',
  edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z',
  trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',
  shuffle: 'M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5',
  star: 'M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z',
  clock: 'M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2',
  pin: 'M12 22s-7-7.6-7-12a7 7 0 1114 0c0 4.4-7 12-7 12zM12 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
  vote: 'M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11',
  link: 'M10 13a5 5 0 007.5.5l3-3a5 5 0 00-7-7l-1.7 1.7M14 11a5 5 0 00-7.5-.5l-3 3a5 5 0 007 7l1.7-1.7',
  download: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3',
  lineup: 'M4 3h16v18H4zM4 12h16M12 3v3M12 18v3M9.5 12a2.5 2.5 0 105 0 2.5 2.5 0 10-5 0',
  megaphone: 'M3 11v2a1 1 0 001 1h3l5 4V6L7 10H4a1 1 0 00-1 1zM16 8a5 5 0 010 8M19 5a9 9 0 010 14',
  home: 'M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1z',
  shield: 'M12 2l8 3v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5z',
  phone: 'M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1.9.4 1.8.7 2.7a2 2 0 01-.5 2.1L8 9.8a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.4c.9.3 1.8.6 2.7.7a2 2 0 011.7 2z',
  arrow: 'M5 12h14M13 6l6 6-6 6',
}

export function Icon({ name, size = 20, className = '', filled = false }: { name: keyof typeof PATHS | string; size?: number; className?: string; filled?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d={PATHS[name] ?? ''} />
    </svg>
  )
}

/** Tarayıcı confirm() yerine satır içi onay: ilk dokunuşta "Emin misin?" sorar. */
export function ConfirmButton({ children, question, onConfirm, className = 'btn-ghost w-full', danger = false }: { children: ReactNode; question: string; onConfirm: () => void; className?: string; danger?: boolean }) {
  const [asking, setAsking] = useState(false)
  if (!asking)
    return (
      <button type="button" className={className} onClick={() => setAsking(true)}>
        {children}
      </button>
    )
  return (
    <div className={`rounded-xl border p-3 text-sm ${danger ? 'border-red-500/40 bg-red-500/10' : 'border-line bg-surface-2'}`}>
      <p className="mb-3">{question}</p>
      <div className="flex gap-2">
        <button type="button" className="btn-ghost flex-1" onClick={() => setAsking(false)}>Vazgeç</button>
        <button
          type="button"
          className={`btn flex-1 ${danger ? 'bg-red-600 text-white' : 'bg-brand text-white'}`}
          onClick={() => {
            setAsking(false)
            onConfirm()
          }}
        >
          Evet
        </button>
      </div>
    </div>
  )
}
