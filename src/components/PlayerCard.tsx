import { ATTR_KEYS, type Attributes, type Player } from '../types'
import { ATTR_LABELS } from '../lib/constants'
import { initials } from '../lib/utils'

/** Genel puana göre kart seviyesi (FIFA'daki bronz / gümüş / altın gibi) */
export const cardTier = (ovr: number | null) => {
  if (ovr == null) return { name: 'Yeni', bg: 'linear-gradient(160deg,#e5e7eb 0%,#cbd5e1 55%,#94a3b8 100%)', ink: '#1f2937', line: 'rgba(31,41,55,.25)' }
  if (ovr >= 80) return { name: 'Elit', bg: 'linear-gradient(160deg,#1e293b 0%,#0f172a 45%,#334155 100%)', ink: '#f5d97a', line: 'rgba(245,217,122,.35)' }
  if (ovr >= 70) return { name: 'Altın', bg: 'linear-gradient(160deg,#f7e08f 0%,#e2bc58 45%,#c99a35 100%)', ink: '#3b2a06', line: 'rgba(59,42,6,.25)' }
  if (ovr >= 60) return { name: 'Gümüş', bg: 'linear-gradient(160deg,#f1f5f9 0%,#cfd6df 45%,#9aa4b1 100%)', ink: '#1f2937', line: 'rgba(31,41,55,.25)' }
  return { name: 'Bronz', bg: 'linear-gradient(160deg,#f1c7a0 0%,#cf9566 45%,#9c6236 100%)', ink: '#3a1f0b', line: 'rgba(58,31,11,.25)' }
}

/**
 * FIFA tarzı oyuncu kartı. Değerler maç sonrası kapalı oylamalardan hesaplanan
 * özelliklerdir; her yeni oylamayla güncellenir.
 */
export default function PlayerCard({
  player,
  attrs,
  ovr,
  club,
  votes,
}: {
  player: Player
  attrs: Attributes | null
  ovr: number | null
  club: string
  votes?: number
}) {
  const t = cardTier(ovr)
  const clubShort = club
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0]!.toLocaleUpperCase('tr'))
    .join('')
    .slice(0, 4)

  return (
    <div className="mx-auto w-full max-w-[260px]">
      <div
        className="relative aspect-[5/7] overflow-hidden shadow-[0_18px_40px_-12px_rgba(15,23,42,.45)]"
        style={{
          background: t.bg,
          color: t.ink,
          clipPath: 'polygon(50% 0, 100% 6%, 100% 88%, 50% 100%, 0 88%, 0 6%)',
          borderRadius: 18,
        }}
      >
        {/* parlama */}
        <div className="pointer-events-none absolute -left-1/3 -top-1/4 h-2/3 w-[160%] rotate-[-18deg] bg-white/20 blur-2xl" />

        {/* üst sol: genel puan ve mevki */}
        <div className="absolute left-[9%] top-[12%] flex flex-col items-center leading-none">
          <span className="text-[44px] font-black tracking-tight">{ovr ?? '–'}</span>
          <span className="mt-1 text-sm font-extrabold">{player.position}</span>
          {player.position2 && <span className="mt-0.5 text-[10px] font-bold opacity-70">{player.position2}</span>}
          <span className="mt-2 h-px w-7" style={{ background: t.line }} />
          <span className="mt-2 text-[11px] font-black">{clubShort}</span>
          {player.number > 0 && <span className="mt-1 text-[11px] font-bold opacity-70">#{player.number}</span>}
        </div>

        {/* oyuncu "fotoğrafı" yerine baş harfler */}
        <div className="absolute right-[8%] top-[9%] grid h-[44%] w-[56%] place-items-end justify-items-center">
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full opacity-[.16]" aria-hidden>
            <circle cx="50" cy="34" r="20" fill="currentColor" />
            <path d="M12 100c2-24 18-36 38-36s36 12 38 36z" fill="currentColor" />
          </svg>
          <span className="relative mb-[18%] text-5xl font-black tracking-tight drop-shadow-sm">{initials(player.name)}</span>
        </div>

        {/* isim */}
        <div className="absolute inset-x-0 top-[55%] text-center">
          <div className="truncate px-4 text-xl font-black tracking-tight">{player.name}</div>
          <div className="mx-auto mt-1 h-px w-3/4" style={{ background: t.line }} />
        </div>

        {/* özellikler */}
        <div className="absolute inset-x-[10%] top-[68%] grid grid-cols-5 gap-1 text-center">
          {ATTR_KEYS.map((k) => (
            <div key={k} className="flex flex-col items-center leading-none">
              <span className="text-[10px] font-bold opacity-75">{ATTR_LABELS[k].short}</span>
              <span className="mt-1 text-lg font-black tabular-nums">{attrs?.[k] ?? '–'}</span>
            </div>
          ))}
        </div>

        {/* alt bilgi */}
        <div className="absolute inset-x-0 bottom-[5.5%] text-center text-[10px] font-bold uppercase tracking-wider opacity-70">
          {t.name}
          {votes ? ` · ${votes} oy` : ''}
        </div>
      </div>
      <p className="mt-2 text-center text-[11px] text-muted">
        {attrs ? 'Kart, maç sonrası kapalı oylamalarla güncellenir.' : 'İlk oylamadan sonra kart değerleri oluşacak.'}
      </p>
    </div>
  )
}
