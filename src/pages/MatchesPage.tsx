import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store/StoreContext'
import MatchRow from '../components/MatchRow'
import { EmptyState, Icon, Tabs } from '../components/ui'
import { formatDayHeader } from '../lib/utils'
import { isRevealed, participants, votingProgress } from '../lib/stats'
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
    <div>
      {pendingVotes.length > 0 && (
        <div className="px-4 pt-4">
          {pendingVotes.map((m) => (
            <Link key={m.id} to={`/mac/${m.id}/oy`} className="mb-2 flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
              <Icon name="vote" className="text-amber-400" />
              <div className="flex-1 text-sm">
                <div className="font-semibold text-amber-300">Oyunu bekleyen bir maç var</div>
                <div className="text-xs text-amber-200/70">
                  {m.teamA.name} – {m.teamB.name} · {formatDayHeader(m.date)}
                </div>
              </div>
              <span className="text-sm font-semibold text-amber-300">Oy ver →</span>
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
  )
}

const Count = ({ n }: { n: number }) => <span className="rounded-full bg-surface-2 px-1.5 text-[11px] text-muted">{n}</span>
