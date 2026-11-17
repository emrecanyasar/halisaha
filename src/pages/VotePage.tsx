import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { usePlayerMap, useStore } from '../store/StoreContext'
import { Avatar, EmptyState, Icon, PageHeader } from '../components/ui'
import { ATTR_LABELS, POSITION_LABELS } from '../lib/constants'
import { isRevealed, participants, sideOf } from '../lib/stats'
import { ratingColor } from '../lib/utils'
import { ATTR_KEYS, type Attributes } from '../types'

interface Entry {
  rating: number
  attrs: Attributes
  attrsTouched: boolean
  touched: boolean
}

const attrsFrom = (r: number) => Object.fromEntries(ATTR_KEYS.map((k) => [k, Math.round(r)])) as Attributes

export default function VotePage() {
  const { id } = useParams()
  const store = useStore()
  const { data } = store
  const players = usePlayerMap()
  const nav = useNavigate()
  const match = data.matches.find((m) => m.id === id)
  const me = data.currentUserId

  const targets = useMemo(() => {
    if (!match || !me) return []
    const mySide = sideOf(match, me)
    // Önce kendi takım arkadaşları, sonra rakipler
    return participants(match)
      .filter((p) => p !== me)
      .sort((a, b) => Number(sideOf(match, a) !== mySide) - Number(sideOf(match, b) !== mySide))
  }, [match, me])

  const [entries, setEntries] = useState<Record<string, Entry>>(() => {
    const init: Record<string, Entry> = {}
    for (const t of targets) {
      const prev = data.votes.find((v) => v.matchId === id && v.voterId === me && v.targetId === t)
      init[t] = prev
        ? { rating: prev.rating, attrs: prev.attrs, attrsTouched: true, touched: true }
        : { rating: 6.5, attrs: attrsFrom(6.5), attrsTouched: false, touched: false }
    }
    return init
  })
  const [open, setOpen] = useState<string | null>(null)

  if (!match) return <EmptyState title="Maç bulunamadı" />
  if (!me)
    return (
      <div className="p-4">
        <PageHeader title="Oy ver" />
        <EmptyState title="Önce kim olduğunu seç" text="Giriş sistemi gelene kadar Ayarlar’dan kendini seçmen gerekiyor." action={<Link to="/ayarlar" className="btn-primary">Ayarlar</Link>} />
      </div>
    )
  if (!participants(match).includes(me))
    return (
      <div className="p-4">
        <PageHeader title="Oy ver" />
        <EmptyState title="Bu maçta oynamadın" text="Sadece maçta oynayanlar birbirine oy verebilir." />
      </div>
    )
  if (match.status !== 'finished' || isRevealed(match, data.votes))
    return (
      <div className="p-4">
        <PageHeader title="Oy ver" />
        <EmptyState title="Oylama açık değil" text={match.status !== 'finished' ? 'Maç bitince oylama açılır.' : 'Bu maçın oylaması kapandı.'} />
      </div>
    )

  const set = (t: string, patch: Partial<Entry>) =>
    setEntries((e) => {
      const cur = e[t]!
      const next = { ...cur, ...patch, touched: true }
      if (patch.rating != null && !cur.attrsTouched) next.attrs = attrsFrom(patch.rating)
      return { ...e, [t]: next }
    })
  const touchedCount = targets.filter((t) => entries[t]?.touched).length
  const mySide = sideOf(match, me)

  const submit = () => {
    store.submitVotes(
      match.id,
      me,
      targets.map((t) => ({ targetId: t, rating: entries[t]!.rating, attrs: entries[t]!.attrs })),
    )
    nav(`/mac/${match.id}`, { replace: true })
  }

  return (
    <div>
      <PageHeader title="Kapalı oylama" />
      <div className="space-y-3 px-4">
        <div className="flex items-start gap-3 rounded-2xl bg-surface-2 p-3 text-xs text-muted">
          <Icon name="lock" size={18} className="mt-0.5 shrink-0 text-brand" />
          <p>
            Oyların gizli. Kimse kime kaç verdiğini göremez; sadece ortalamalar gösterilir. Her oyuncuya 1–10 arası maç puanı ver.
            İstersen özelliklerini de ayrı ayrı puanla, bu puanlar oyuncunun profilindeki özellikleri belirler.
          </p>
        </div>

        {targets.map((t, i) => {
          const p = players.get(t)
          const e = entries[t]!
          const teammate = sideOf(match, t) === mySide
          const showDivider = i > 0 && teammate !== (sideOf(match, targets[i - 1]!) === mySide)
          const team = sideOf(match, t) === 'A' ? match.teamA : match.teamB
          return (
            <div key={t}>
              {(i === 0 || showDivider) && <div className="section-title mt-4">{teammate ? 'Takım arkadaşların' : 'Rakipler'}</div>}
              <div className={`card p-3 ${e.touched ? '' : 'border-dashed'}`}>
                <div className="flex items-center gap-3">
                  <Avatar player={p} size={38} color={team.color} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{p?.name}</div>
                    <div className="text-xs text-muted">{p && POSITION_LABELS[p.position]}</div>
                  </div>
                  <span className="grid h-11 w-14 place-items-center rounded-lg text-xl font-extrabold text-white" style={{ background: ratingColor(e.rating) }}>
                    {e.rating.toFixed(1)}
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={0.5}
                  value={e.rating}
                  onChange={(ev) => set(t, { rating: Number(ev.target.value) })}
                  className="mt-3 w-full"
                  aria-label={`${p?.name} maç puanı`}
                />
                <div className="flex justify-between text-[10px] text-muted">
                  <span>1 · Kötü</span>
                  <span>6 · Ortalama</span>
                  <span>10 · Efsane</span>
                </div>
                <button className="mt-2 flex w-full items-center justify-between text-xs font-semibold text-muted" onClick={() => setOpen(open === t ? null : t)}>
                  <span>Özellikleri puanla {e.attrsTouched ? '✓' : '(isteğe bağlı)'}</span>
                  <span>{open === t ? '▲' : '▼'}</span>
                </button>
                {open === t && (
                  <div className="mt-3 space-y-2 border-t border-line pt-3">
                    {ATTR_KEYS.map((k) => (
                      <div key={k} className="flex items-center gap-3">
                        <span className="w-28 shrink-0 text-xs text-muted">{ATTR_LABELS[k].long}</span>
                        <input
                          type="range"
                          min={1}
                          max={10}
                          step={1}
                          value={e.attrs[k]}
                          onChange={(ev) => set(t, { attrs: { ...e.attrs, [k]: Number(ev.target.value) }, attrsTouched: true })}
                          className="flex-1"
                          aria-label={`${p?.name} ${ATTR_LABELS[k].long}`}
                        />
                        <span className="w-5 text-right text-sm font-bold tabular-nums">{e.attrs[k]}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}

        <div className="sticky bottom-20 pt-2">
          <button className="btn-primary w-full py-3 shadow-xl" onClick={submit} disabled={touchedCount < targets.length}>
            {touchedCount < targets.length ? `${targets.length - touchedCount} oyuncu daha puanla` : 'Oylarımı gönder'}
          </button>
        </div>
      </div>
    </div>
  )
}
