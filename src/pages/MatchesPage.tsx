import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store/StoreContext'
import MatchRow from '../components/MatchRow'
import { Avatar, EmptyState, Icon, RatingBadge, Tabs } from '../components/ui'
import { attrColor, formatDayHeader } from '../lib/utils'
import { isRevealed, matchMvp, participants, playerSummary, votingProgress } from '../lib/stats'
import type { Match } from '../types'

type Tab = 'upcoming' | 'finished'

export default function MatchesPage() {
  const { data } = useStore()
  const [tab, setTab] = useState<Tab>('upcoming')

  const { upcoming, finished, pendingVotes } = useMemo(() => {
    const key = (m: Match) => m.date + m.time
    const upcoming = data.matches.filter((m) => m.status === 'planned').sort((a, b) => (key(a) < key(b) ? -1 : 1))
    const finished = data.matches.filter((m) => m.status === 'finished').sort((a, b) => (key(a) < key(b) ? 1 : -1))
    const me = data.currentUserId
    const pendingVotes = me
      ? finished.filter((m) => !isRevealed(m, data.votes) && participants(m).includes(me) && !votingProgress(m, data.votes).done.includes(me))
      : []
    return { upcoming, finished, pendingVotes }
  }, [data])

  const list = tab === 'upcoming' ? upcoming : finished
  const groups = useMemo(() => {
    const g = new Map<string, Match[]>()
    for (const m of list) g.set(m.date, [...(g.get(m.date) ?? []), m])
    return [...g.entries()]
  }, [list])

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-6">
    <div>
      {pendingVotes.length > 0 && (
        <div className="px-4 pt-4">
          {pendingVotes.map((m) => (
            <Link key={m.id} to={`/mac/${m.id}/oy`} className="mb-2 flex items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3">
              <Icon name="vote" className="text-amber-600" />
              <div className="flex-1 text-sm">
                <div className="font-semibold text-amber-800">Oyunu bekleyen bir maç var</div>
                <div className="text-xs text-amber-700/80">
                  {m.teamA.name} – {m.teamB.name} · {formatDayHeader(m.date)}
                </div>
              </div>
              <span className="text-sm font-semibold text-amber-800">Oy ver →</span>
            </Link>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between px-4 pt-4">
        <h1 className="text-2xl font-extrabold">Maçlar</h1>
        <Link to="/mac/yeni" className="btn-primary">
          <Icon name="plus" size={18} /> Maç oluştur
        </Link>
      </div>

      <div className="mt-2">
        <Tabs<Tab>
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'upcoming', label: 'Yaklaşan', badge: <Count n={upcoming.length} /> },
            { id: 'finished', label: 'Biten', badge: <Count n={finished.length} /> },
          ]}
        />
      </div>

      <div className="space-y-4 p-4">
        {groups.length === 0 && (
          <EmptyState
            title={tab === 'upcoming' ? 'Planlanmış maç yok' : 'Henüz biten maç yok'}
            text={tab === 'upcoming' ? 'Gün ve saati belirleyip kadroyu kur.' : undefined}
            action={tab === 'upcoming' && <Link to="/mac/yeni" className="btn-primary">Maç oluştur</Link>}
          />
        )}
        {groups.map(([date, ms]) => (
          <section key={date} className="card overflow-hidden">
            <div className="border-b border-line bg-surface-2/60 px-4 py-2 text-xs font-semibold capitalize text-muted">{formatDayHeader(date)}</div>
            <div className="divide-y divide-line">
              {ms.map((m) => (
                <MatchRow key={m.id} match={m} votes={data.votes} currentUserId={data.currentUserId} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
    <Highlights />
    </div>
  )
}

const Count = ({ n }: { n: number }) => <span className="rounded-full bg-surface-2 px-1.5 text-[11px] text-muted">{n}</span>

/** Masaüstünde sağ sütun: öne çıkan oyuncular ve son maçın oyuncusu */
function Highlights() {
  const { data } = useStore()
  const top = useMemo(
    () =>
      data.players
        .map((p) => playerSummary(data, p))
        .filter((x) => x.ovr != null)
        .sort((a, b) => b.ovr! - a.ovr!)
        .slice(0, 5),
    [data],
  )
  const lastRevealed = useMemo(
    () =>
      data.matches
        .filter((m) => isRevealed(m, data.votes))
        .sort((a, b) => (a.date + a.time < b.date + b.time ? 1 : -1))[0],
    [data],
  )
  const mvp = lastRevealed ? matchMvp(lastRevealed, data.votes) : null
  const mvpPlayer = mvp ? data.players.find((p) => p.id === mvp.playerId) : undefined
  return (
    <aside className="sticky top-16 hidden space-y-4 pt-4 lg:block">
      {mvp && mvpPlayer && lastRevealed && (
        <Link to={`/mac/${lastRevealed.id}`} className="card block p-4" style={{ background: 'linear-gradient(135deg, rgba(55,77,245,.10), #ffffff 70%)' }}>
          <div className="text-xs font-semibold uppercase tracking-wider text-blue-700">⭐ Son maçın oyuncusu</div>
          <div className="mt-3 flex items-center gap-3">
            <Avatar player={mvpPlayer} size={44} color="#374df5" />
            <div className="min-w-0 flex-1">
              <div className="truncate font-bold">{mvpPlayer.name}</div>
              <div className="text-xs text-muted">{lastRevealed.teamA.name} – {lastRevealed.teamB.name}</div>
            </div>
            <RatingBadge value={mvp.rating} size="lg" />
          </div>
        </Link>
      )}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="font-bold">En iyi oyuncular</h2>
          <Link to="/oyuncular" className="text-xs font-semibold text-brand">Tümü</Link>
        </div>
        {top.length === 0 && <p className="p-4 text-sm text-muted">Oylamalar tamamlandıkça burada görünecek.</p>}
        <div className="divide-y divide-line">
          {top.map((x, i) => (
            <Link key={x.player.id} to={`/oyuncu/${x.player.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-2">
              <span className="w-4 text-xs font-semibold text-muted">{i + 1}</span>
              <Avatar player={x.player} size={30} />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{x.player.name}</span>
              <span className="text-sm font-extrabold" style={{ color: attrColor(x.ovr!) }}>{x.ovr}</span>
            </Link>
          ))}
        </div>
      </div>
    </aside>
  )
}
