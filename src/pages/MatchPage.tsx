import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { usePlayerMap, useStore } from '../store/StoreContext'
import Pitch from '../components/Pitch'
import { Avatar, ConfirmButton, EmptyState, Icon, PageHeader, RatingBadge, Sheet, Tabs } from '../components/ui'
import { FORMATIONS, POSITION_LABELS, formationLabel } from '../lib/constants'
import { balanceTeams, isRevealed, matchMvp, matchRatings, participants, playerSummary, score, votingProgress } from '../lib/stats'
import { formatDayHeader } from '../lib/utils'
import { useIsDesktop } from '../lib/hooks'
import type { Match, TeamSide } from '../types'

type Tab = 'kadro' | 'ratingler' | 'bilgi'

export default function MatchPage() {
  const { id } = useParams()
  const store = useStore()
  const { data } = store
  const match = data.matches.find((m) => m.id === id)
  const [tab, setTab] = useState<Tab>(match?.status === 'finished' ? 'ratingler' : 'kadro')
  const isDesktop = useIsDesktop()

  if (!match)
    return (
      <div className="p-4">
        <PageHeader title="Maç" />
        <EmptyState title="Maç bulunamadı" action={<Link to="/" className="btn-ghost">Maçlara dön</Link>} />
      </div>
    )

  const finished = match.status === 'finished'

  // Masaüstü: solda maç başlığı + saha, sağda ratingler / bilgi
  if (isDesktop) {
    const sideTab: Tab = tab === 'kadro' ? (finished ? 'ratingler' : 'bilgi') : tab
    return (
      <div>
        <PageHeader title={`${match.teamA.name} – ${match.teamB.name}`} />
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start gap-6 px-4 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <div className="space-y-4">
            <MatchHeader match={match} flush />
            <LineupTab match={match} />
          </div>
          <div className="card sticky top-4 overflow-hidden">
            <Tabs<Tab>
              value={sideTab}
              onChange={setTab}
              tabs={[...(finished ? [{ id: 'ratingler' as const, label: 'Ratingler' }] : []), { id: 'bilgi', label: 'Bilgi' }]}
            />
            <div className="max-h-[calc(100vh-7rem)] overflow-y-auto p-4">
              {sideTab === 'ratingler' && <RatingsTab match={match} />}
              {sideTab === 'bilgi' && <InfoTab match={match} />}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title={`${match.teamA.name} – ${match.teamB.name}`} />
      <MatchHeader match={match} />
      <div className="mt-3">
        <Tabs<Tab>
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'kadro', label: 'Kadro' },
            ...(finished ? [{ id: 'ratingler' as const, label: 'Ratingler' }] : []),
            { id: 'bilgi', label: 'Bilgi' },
          ]}
        />
      </div>
      <div className="p-4">
        {tab === 'kadro' && <LineupTab match={match} />}
        {tab === 'ratingler' && finished && <RatingsTab match={match} />}
        {tab === 'bilgi' && <InfoTab match={match} />}
      </div>
    </div>
  )
}

function MatchHeader({ match, flush = false }: { match: Match; flush?: boolean }) {
  const players = usePlayerMap()
  const s = score(match)
  const finished = match.status === 'finished'
  const goalsFor = (side: TeamSide) => match.goals.filter((g) => g.team === side)
  return (
    <div className={`card p-4 ${flush ? '' : 'mx-4'}`}>
      <div className="text-center text-xs capitalize text-muted">
        {formatDayHeader(match.date)} · {match.time}
        {match.venue && <div className="mt-0.5 normal-case">{match.venue}</div>}
      </div>
      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <TeamBadge name={match.teamA.name} color={match.teamA.color} />
        <div className="text-center">
          {finished ? (
            <div className="text-4xl font-extrabold tabular-nums">
              {s.a} <span className="text-muted">-</span> {s.b}
            </div>
          ) : (
            <div className="text-3xl font-extrabold">{match.time}</div>
          )}
          <div className={`mt-1 text-xs font-semibold ${finished ? 'text-muted' : 'text-brand'}`}>
            {finished ? 'Maç sonu' : `${match.playersPerSide}v${match.playersPerSide} · Planlandı`}
          </div>
        </div>
        <TeamBadge name={match.teamB.name} color={match.teamB.color} />
      </div>
      {finished && match.goals.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-4 border-t border-line pt-3 text-xs">
          {(['A', 'B'] as const).map((side) => (
            <ul key={side} className={`space-y-1 ${side === 'B' ? 'text-right' : ''}`}>
              {goalsFor(side).map((g) => (
                <li key={g.id}>
                  <span>⚽ {g.scorerId ? players.get(g.scorerId)?.name ?? '?' : 'K.K.'}</span>
                  {g.assistId && <span className="text-muted"> ({players.get(g.assistId)?.name.split(' ')[0]})</span>}
                </li>
              ))}
            </ul>
          ))}
        </div>
      )}
      <div className="mt-4 flex gap-2">
        {finished ? (
          <Link to={`/mac/${match.id}/sonuc`} className="btn-ghost flex-1">
            <Icon name="edit" size={16} /> Skoru düzenle
          </Link>
        ) : (
          <Link to={`/mac/${match.id}/sonuc`} className="btn-primary flex-1">
            Maçı bitir · skoru gir
          </Link>
        )}
      </div>
    </div>
  )
}

function TeamBadge({ name, color }: { name: string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl text-xl font-extrabold text-white shadow-md ring-1 ring-black/5" style={{ background: color, color: color === '#f8fafc' ? '#111' : '#fff' }}>
        {name[0]}
      </span>
      <span className="line-clamp-2 text-sm font-semibold">{name}</span>
    </div>
  )
}

function LineupTab({ match }: { match: Match }) {
  const store = useStore()
  const { data } = store
  const players = usePlayerMap()
  const [picker, setPicker] = useState<{ side: TeamSide; index: number } | null>(null)
  const [balanceOpen, setBalanceOpen] = useState(false)
  const editable = match.status === 'planned'
  const hasCustom = [...(match.teamA.positions ?? []), ...(match.teamB.positions ?? [])].some(Boolean)
  const revealed = isRevealed(match, data.votes)
  const ratings = matchRatings(match, data.votes)
  const mvp = matchMvp(match, data.votes)
  const goalsBy = useMemo(() => {
    const m = new Map<string, number>()
    for (const g of match.goals) if (g.scorerId) m.set(g.scorerId, (m.get(g.scorerId) ?? 0) + 1)
    return m
  }, [match.goals])
  const inMatch = new Set(participants(match))
  const bench = data.players.filter((p) => !inMatch.has(p.id))
  const current = picker ? (picker.side === 'A' ? match.teamA : match.teamB).slots[picker.index] : null

  return (
    <div className="space-y-4">
      {editable && (
        <div className="card space-y-3 p-3">
          <div>
            <div className="label">Kişi sayısı (takım başı)</div>
            <div className="flex gap-1.5 overflow-x-auto">
              {Object.keys(FORMATIONS).map(Number).map((n) => (
                <button
                  key={n}
                  onClick={() => store.setPlayersPerSide(match.id, n)}
                  className={`min-w-10 flex-1 rounded-lg py-2 text-sm font-bold ${match.playersPerSide === n ? 'bg-brand text-white' : 'bg-surface-2'}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(['A', 'B'] as const).map((side) => {
              const team = side === 'A' ? match.teamA : match.teamB
              return (
                <div key={side}>
                  <div className="label flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: team.color }} /> {team.name} dizilişi
                  </div>
                  <select
                    className="input py-2"
                    value={team.formation.join(',')}
                    onChange={(e) => store.setFormation(match.id, side, e.target.value.split(',').map(Number))}
                  >
                    {FORMATIONS[match.playersPerSide]!.map((f) => (
                      <option key={f.join(',')} value={f.join(',')}>
                        {formationLabel(f)}
                      </option>
                    ))}
                  </select>
                </div>
              )
            })}
          </div>
          <div className="flex gap-2">
            <button className="btn-ghost flex-1" onClick={() => setBalanceOpen(true)}>
              <Icon name="shuffle" size={16} /> Dengeli takım kur
            </button>
            <button
              className="btn-ghost"
              onClick={() => {
                const empty = Array<string | null>(match.playersPerSide).fill(null)
                store.setLineups(match.id, [...empty], [...empty])
              }}
            >
              Temizle
            </button>
          </div>
        </div>
      )}

      <Pitch
        match={match}
        players={players}
        editable={editable}
        onSlotClick={(side, index) => setPicker({ side, index })}
        onMove={(side, index, pos) => store.setSlotPosition(match.id, side, index, pos)}
        ratings={revealed ? ratings : undefined}
        mvpId={revealed ? mvp?.playerId : null}
        goalsBy={goalsBy}
      />
      {editable && (
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-xs text-muted">
          <span>Dokun: oyuncu ekle / değiştir · Basılı tutup sürükle: yerini değiştir</span>
          {hasCustom && (
            <button className="font-semibold text-brand" onClick={() => store.resetPositions(match.id)}>
              Dizilişe sıfırla
            </button>
          )}
        </div>
      )}

      {bench.length > 0 && (
        <div>
          <div className="section-title">Kadroda olmayanlar ({bench.length})</div>
          <div className="card flex flex-wrap gap-2 p-3">
            {bench.map((p) => (
              <span key={p.id} className="rounded-full bg-surface-2 px-2.5 py-1 text-xs">
                {p.name} <span className="text-muted">· {p.position}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <Sheet open={!!picker} onClose={() => setPicker(null)} title="Oyuncu seç">
        {picker && (
          <div className="space-y-1">
            {current && (
              <button
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-red-600 hover:bg-surface-2"
                onClick={() => {
                  store.assignSlot(match.id, picker.side, picker.index, null)
                  setPicker(null)
                }}
              >
                <Icon name="close" /> Bu yeri boşalt ({players.get(current)?.name})
              </button>
            )}
            {data.players.length === 0 && (
              <EmptyState title="Henüz oyuncu yok" action={<Link to="/oyuncu/yeni" className="btn-primary">Oyuncu ekle</Link>} />
            )}
            {[...data.players]
              .sort((a, b) => Number(inMatch.has(a.id)) - Number(inMatch.has(b.id)) || a.name.localeCompare(b.name, 'tr'))
              .map((p) => {
                const where = match.teamA.slots.includes(p.id) ? match.teamA.name : match.teamB.slots.includes(p.id) ? match.teamB.name : null
                const s = playerSummary(data, p)
                return (
                  <button
                    key={p.id}
                    disabled={p.id === current}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-surface-2 disabled:opacity-40"
                    onClick={() => {
                      store.assignSlot(match.id, picker.side, picker.index, p.id)
                      setPicker(null)
                    }}
                  >
                    <Avatar player={p} size={36} />
                    <div className="flex-1">
                      <div className="text-sm font-semibold">{p.name}</div>
                      <div className="text-xs text-muted">
                        {POSITION_LABELS[p.position]}
                        {where && <span className="text-amber-600"> · {where} kadrosunda (yer değiştirir)</span>}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-muted">{s.ovr ?? '–'}</span>
                  </button>
                )
              })}
          </div>
        )}
      </Sheet>

      <BalanceSheet match={match} open={balanceOpen} onClose={() => setBalanceOpen(false)} />
    </div>
  )
}

function BalanceSheet({ match, open, onClose }: { match: Match; open: boolean; onClose: () => void }) {
  const store = useStore()
  const { data } = store
  const need = match.playersPerSide * 2
  const [selected, setSelected] = useState<Set<string>>(() => new Set(participants(match)))
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else if (n.size < need) n.add(id)
      return n
    })
  return (
    <Sheet open={open} onClose={onClose} title={`Gelecekleri seç (${selected.size}/${need})`}>
      <p className="px-2 pb-3 text-xs text-muted">
        Seçilen oyuncular özellik puanlarına göre iki takıma dengeli dağıtılır. Kaleciler ilk sıraya yerleşir.
      </p>
      <div className="space-y-1">
        {data.players.map((p) => {
          const s = playerSummary(data, p)
          const on = selected.has(p.id)
          return (
            <button key={p.id} onClick={() => toggle(p.id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left ${on ? 'bg-brand/10' : 'hover:bg-surface-2'}`}>
              <span className={`grid h-5 w-5 place-items-center rounded-md border ${on ? 'border-brand bg-brand text-white' : 'border-line'}`}>
                {on && <Icon name="check" size={14} />}
              </span>
              <span className="flex-1 text-sm">{p.name}</span>
              <span className="text-xs text-muted">{p.position}</span>
              <span className="w-6 text-right text-xs font-bold">{s.ovr ?? '–'}</span>
            </button>
          )
        })}
      </div>
      <button
        className="btn-primary mt-4 w-full"
        disabled={selected.size < 2}
        onClick={() => {
          const { a, b } = balanceTeams(data, [...selected], match.playersPerSide)
          store.setLineups(match.id, a, b)
          onClose()
        }}
      >
        Takımları dağıt
      </button>
    </Sheet>
  )
}

function RatingsTab({ match }: { match: Match }) {
  const store = useStore()
  const { data } = store
  const players = usePlayerMap()
  const revealed = isRevealed(match, data.votes)
  const prog = votingProgress(match, data.votes)
  const ratings = matchRatings(match, data.votes)
  const mvp = matchMvp(match, data.votes)
  const me = data.currentUserId
  const iPlayed = !!me && participants(match).includes(me)
  const iVoted = !!me && prog.done.includes(me)

  if (!revealed) {
    return (
      <div className="space-y-4">
        <div className="card flex flex-col items-center gap-3 p-6 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-surface-2 text-muted">
            <Icon name="lock" />
          </span>
          <div className="font-bold">Oylama devam ediyor</div>
          <p className="text-sm text-muted">
            Oylar kapalı. Kimin kime ne verdiği hiçbir zaman gösterilmez. Herkes oy verince ya da oylama kapatılınca ratingler açılır.
          </p>
          <div className="w-full">
            <div className="mb-1 flex justify-between text-xs text-muted">
              <span>Oy verenler</span>
              <span>
                {prog.done.length}/{prog.total}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-brand" style={{ width: `${(prog.done.length / Math.max(1, prog.total)) * 100}%` }} />
            </div>
          </div>
          {iPlayed ? (
            <Link to={`/mac/${match.id}/oy`} className="btn-primary w-full">
              {iVoted ? 'Oylarımı düzenle' : 'Oy ver'}
            </Link>
          ) : (
            <p className="text-xs text-muted">{me ? 'Bu maçta oynamadığın için oy veremezsin.' : 'Oy vermek için Ayarlar’dan kim olduğunu seç.'}</p>
          )}
        </div>
        <div>
          <div className="section-title">Durum</div>
          <div className="card divide-y divide-line">
            {participants(match).map((pid) => (
              <div key={pid} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <Avatar player={players.get(pid)} size={28} />
                <span className="flex-1">{players.get(pid)?.name}</span>
                {prog.done.includes(pid) ? (
                  <span className="flex items-center gap-1 text-xs text-brand"><Icon name="check" size={14} /> Oy verdi</span>
                ) : (
                  <span className="text-xs text-muted">Bekleniyor</span>
                )}
              </div>
            ))}
          </div>
        </div>
        <button className="btn-ghost w-full" onClick={() => store.setVotingClosed(match.id, true)}>
          Oylamayı kapat ve ratingleri aç
        </button>
      </div>
    )
  }

  const teamList = (side: TeamSide) => {
    const team = side === 'A' ? match.teamA : match.teamB
    const ids = team.slots.filter((x): x is string => !!x)
    return ids
      .map((id) => ({ id, r: ratings.get(id) }))
      .sort((a, b) => (b.r?.rating ?? 0) - (a.r?.rating ?? 0))
      .map(({ id, r }) => {
        const p = players.get(id)
        const goals = match.goals.filter((g) => g.scorerId === id).length
        const assists = match.goals.filter((g) => g.assistId === id).length
        return (
          <Link key={id} to={`/oyuncu/${id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-2">
            <Avatar player={p} size={34} color={team.color} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">
                {p?.name ?? 'Silinmiş oyuncu'} {mvp?.playerId === id && <span title="Maçın oyuncusu">⭐</span>}
              </div>
              <div className="text-xs text-muted">
                {p && POSITION_LABELS[p.position]}
                {goals > 0 && ` · ⚽ ${goals}`}
                {assists > 0 && ` · 🅰️ ${assists}`}
                {r && ` · ${r.votes} oy`}
              </div>
            </div>
            <RatingBadge value={r?.rating} />
          </Link>
        )
      })
  }

  const mvpPlayer = mvp ? players.get(mvp.playerId) : undefined
  return (
    <div className="space-y-4">
      {mvp && mvpPlayer && (
        <Link to={`/oyuncu/${mvp.playerId}`} className="card flex items-center gap-4 p-4" style={{ background: 'linear-gradient(135deg, rgba(55,77,245,.12), #ffffff 65%)' }}>
          <Avatar player={mvpPlayer} size={52} color="#374df5" />
          <div className="flex-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-blue-700">⭐ Maçın oyuncusu</div>
            <div className="text-lg font-bold">{mvpPlayer.name}</div>
          </div>
          <RatingBadge value={mvp.rating} size="lg" />
        </Link>
      )}
      {(['A', 'B'] as const).map((side) => (
        <div key={side}>
          <div className="section-title flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: (side === 'A' ? match.teamA : match.teamB).color }} />
            {(side === 'A' ? match.teamA : match.teamB).name}
          </div>
          <div className="card divide-y divide-line overflow-hidden">{teamList(side)}</div>
        </div>
      ))}
      <p className="text-center text-xs text-muted">
        Rating = maçta oynayan diğer oyuncuların verdiği kapalı oyların ortalaması. {prog.done.length}/{prog.total} kişi oy verdi.
      </p>
      {match.votingClosed && !prog.complete && (
        <button className="btn-ghost w-full" onClick={() => store.setVotingClosed(match.id, false)}>
          Oylamayı tekrar aç
        </button>
      )}
    </div>
  )
}

function InfoTab({ match }: { match: Match }) {
  const store = useStore()
  const nav = useNavigate()
  const [f, setF] = useState({ date: match.date, time: match.time, venue: match.venue, a: match.teamA.name, b: match.teamB.name })
  const dirty = f.date !== match.date || f.time !== match.time || f.venue !== match.venue || f.a !== match.teamA.name || f.b !== match.teamB.name
  return (
    <div className="space-y-4">
      <div className="card space-y-3 p-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Gün</label>
            <input type="date" className="input" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
          </div>
          <div>
            <label className="label">Saat</label>
            <input type="time" className="input" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="label">Saha</label>
          <input className="input" value={f.venue} onChange={(e) => setF({ ...f, venue: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">1. Takım adı</label>
            <input className="input" value={f.a} onChange={(e) => setF({ ...f, a: e.target.value })} />
          </div>
          <div>
            <label className="label">2. Takım adı</label>
            <input className="input" value={f.b} onChange={(e) => setF({ ...f, b: e.target.value })} />
          </div>
        </div>
        <button
          className="btn-primary w-full"
          disabled={!dirty}
          onClick={() =>
            store.updateMatch(match.id, {
              date: f.date,
              time: f.time,
              venue: f.venue,
              teamA: { ...match.teamA, name: f.a || match.teamA.name },
              teamB: { ...match.teamB, name: f.b || match.teamB.name },
            })
          }
        >
          Kaydet
        </button>
      </div>
      {match.status === 'finished' && (
        <ConfirmButton question='Maç tekrar "planlandı" durumuna alınacak ve bu maçın tüm oyları silinecek. Emin misin?' onConfirm={() => store.reopenMatch(match.id)}>
          Maçı planlandı durumuna geri al
        </ConfirmButton>
      )}
      <ConfirmButton
        danger
        className="btn-danger w-full"
        question="Bu maç ve tüm oyları silinecek. Emin misin?"
        onConfirm={() => {
          store.deleteMatch(match.id)
          nav('/', { replace: true })
        }}
      >
        <Icon name="trash" size={16} /> Maçı sil
      </ConfirmButton>
    </div>
  )
}
