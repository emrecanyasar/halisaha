import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { usePlayerMap, useStore } from '../store/StoreContext'
import { Avatar, EmptyState, Icon, PageHeader } from '../components/ui'
import { ATTR_WEIGHTS, attrLabels, keyAttrs, positionText } from '../lib/constants'
import { isRevealed, participants, sideOf } from '../lib/stats'
import { voteScore } from '../lib/rating'
import { ratingColor } from '../lib/utils'
import { ATTR_KEYS, type Attributes } from '../types'

const DEFAULT: Attributes = { hucum: 6, teknik: 6, pas: 6, savunma: 6, fizik: 6 }

/** Maç sonu kapalı oylama: tek tek oyuncu, her oyuncuya 5 özellik puanı. Maç puanı = ortalama. */
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

  const [vals, setVals] = useState<Record<string, Attributes>>(() => {
    const init: Record<string, Attributes> = {}
    for (const t of targets) init[t] = data.votes.find((v) => v.matchId === id && v.voterId === me && v.targetId === t)?.attrs ?? { ...DEFAULT }
    return init
  })
  const [done, setDone] = useState<Set<string>>(() => new Set(targets.filter((t) => data.votes.some((v) => v.matchId === id && v.voterId === me && v.targetId === t))))
  const [idx, setIdx] = useState(0)

  if (!match) return <EmptyState title="Maç bulunamadı" />
  if (!me)
    return (
      <div className="p-4">
        <PageHeader title="Oy ver" />
        <EmptyState title="Önce giriş yap" action={<Link to="/giris" className="btn-primary">Giriş yap</Link>} />
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
  if (!targets.length)
    return (
      <div className="p-4">
        <PageHeader title="Oy ver" />
        <EmptyState title="Puanlanacak oyuncu yok" />
      </div>
    )

  const mySide = sideOf(match, me)
  const i = Math.min(idx, targets.length - 1)
  const cur = targets[i]!
  const p = players.get(cur)
  const v = vals[cur] ?? DEFAULT
  const teammate = sideOf(match, cur) === mySide
  const team = sideOf(match, cur) === 'A' ? match.teamA : match.teamB
  const score = voteScore(v, p?.position)
  const labels = attrLabels(p?.position)
  const important = p ? keyAttrs(p.position) : []
  // Mevki için önemli özellikler önce
  const order = p ? [...ATTR_KEYS].sort((a, b) => ATTR_WEIGHTS[p.position][b] - ATTR_WEIGHTS[p.position][a]) : ATTR_KEYS
  const left = targets.length - done.size
  const last = i === targets.length - 1

  const setAttr = (k: keyof Attributes, n: number) => {
    setVals((x) => ({ ...x, [cur]: { ...v, [k]: n } }))
    setDone((s) => new Set(s).add(cur))
  }
  const next = () => {
    setDone((s) => new Set(s).add(cur))
    if (!last) setIdx(i + 1)
  }
  const submit = () => {
    store.submitVotes(match.id, me, targets.map((t) => ({ targetId: t, attrs: vals[t] ?? DEFAULT })))
    nav(`/mac/${match.id}`, { replace: true })
  }

  return (
    <div className="lg:max-w-2xl">
      <PageHeader title="Kapalı oylama" />
      <div className="space-y-3 px-4 lg:px-0">
        <div className="flex items-start gap-3 rounded-2xl bg-surface-2 p-3 text-xs text-muted">
          <Icon name="lock" size={18} className="mt-0.5 shrink-0 text-brand" />
          <p>Oyların gizli; kimse kime kaç verdiğini göremez. Her oyuncunun 5 özelliğini 1–10 arası puanla. Maç puanı mevkiye göre hesaplanır: forvette şut, defansta ikili mücadele daha çok sayılır. Kalecilerin özellikleri farklıdır.</p>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted">
            <span className="font-bold text-ink">{i + 1} / {targets.length} oyuncu</span>
            <span>{done.size} tamamlandı</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${(done.size / targets.length) * 100}%` }} />
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 pt-1">
          {targets.map((t, ti) => {
            const tp = players.get(t)
            const tTeam = sideOf(match, t) === 'A' ? match.teamA : match.teamB
            const on = ti === i
            return (
              <button
                key={t}
                type="button"
                onClick={() => setIdx(ti)}
                aria-label={tp?.name}
                className={`relative shrink-0 rounded-full transition ${on ? 'ring-2 ring-brand ring-offset-2' : done.has(t) ? '' : 'opacity-50'}`}
              >
                <Avatar player={tp} size={40} color={tTeam.color} />
                {done.has(t) && (
                  <span className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full border-2 border-surface bg-brand text-white">
                    <Icon name="check" size={9} />
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div className="card space-y-4 p-4">
          <div className="flex items-center gap-3">
            <Avatar player={p} size={52} color={team.color} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-lg font-extrabold">{p?.name}</div>
              <div className="truncate text-xs text-muted">
                {p && positionText(p)} · {teammate ? 'Takım arkadaşın' : 'Rakip'}
              </div>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span className="grid h-11 min-w-14 place-items-center rounded-xl px-2 text-xl font-extrabold text-white" style={{ background: ratingColor(score) }}>
                {score.toFixed(1)}
              </span>
              <span className="text-[10px] text-muted">maç puanı</span>
            </div>
          </div>

          {order.map((k) => (
            <label key={k} className="block">
              <span className="flex items-baseline justify-between gap-2 text-sm">
                <span>
                  <b>{labels[k].long}</b>{' '}
                  {important.includes(k) && <span className="rounded bg-green-100 px-1 py-px text-[10px] font-bold text-green-800">önemli</span>}{' '}
                  <span className="text-[11px] text-muted">{labels[k].hint}</span>
                </span>
                <b className="tabular-nums" style={{ color: ratingColor(v[k]) }}>{v[k]}</b>
              </span>
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={v[k]}
                onChange={(e) => setAttr(k, Number(e.target.value))}
                className="mt-1 h-6 w-full cursor-pointer"
                style={{ accentColor: '#16a34a' }}
                aria-label={`${p?.name} ${labels[k].long}`}
              />
            </label>
          ))}

          <div className="flex gap-2">
            <button type="button" className="btn-ghost flex-1 py-3" onClick={() => setIdx(Math.max(0, i - 1))} disabled={i === 0}>
              ← Önceki
            </button>
            <button type="button" className="btn-primary flex-[2] py-3" onClick={next}>
              {last ? 'Tamam ✓' : 'Sonraki oyuncu →'}
            </button>
          </div>
        </div>

        <div className="sticky bottom-20 pt-1 lg:bottom-4">
          <button className="btn-primary w-full py-3 shadow-xl" onClick={submit} disabled={left > 0}>
            {left > 0 ? `${left} oyuncu daha puanla` : 'Oylarımı gönder'}
          </button>
        </div>
      </div>
    </div>
  )
}
