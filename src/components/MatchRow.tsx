import { Link } from 'react-router-dom'
import type { Match, Vote } from '../types'
import { isRevealed, participants, score, votingProgress } from '../lib/stats'

export default function MatchRow({ match, votes, currentUserId }: { match: Match; votes: Vote[]; currentUserId: string | null }) {
  const finished = match.status === 'finished'
  const s = score(match)
  const revealed = isRevealed(match, votes)
  const prog = votingProgress(match, votes)
  const filled = participants(match).length
  const needsMyVote = finished && !revealed && !!currentUserId && participants(match).includes(currentUserId) && !prog.done.includes(currentUserId)

  const teamLine = (name: string, color: string, goals: number, win: boolean) => (
    <div className="flex items-center gap-2.5">
      <span className="h-3.5 w-3.5 shrink-0 rounded-sm" style={{ background: color }} />
      <span className={`flex-1 truncate text-sm ${finished && !win ? 'text-muted' : 'font-semibold'}`}>{name}</span>
      {finished && <span className={`w-5 text-right text-sm tabular-nums ${win ? 'font-bold' : 'text-muted'}`}>{goals}</span>}
    </div>
  )

  return (
    <Link to={`/mac/${match.id}`} className="flex items-center gap-3 px-4 py-3 transition hover:bg-surface-2">
      <div className="flex w-12 shrink-0 flex-col items-center text-xs">
        <span className={finished ? 'text-muted' : 'font-semibold text-ink'}>{match.time}</span>
        <span className={`mt-0.5 text-[10px] font-semibold ${finished ? 'text-muted' : 'text-brand'}`}>{finished ? 'MS' : `${match.playersPerSide}v${match.playersPerSide}`}</span>
      </div>
      <div className="flex-1 space-y-1.5 border-l border-line pl-3">
        {teamLine(match.teamA.name, match.teamA.color, s.a, s.a >= s.b)}
        {teamLine(match.teamB.name, match.teamB.color, s.b, s.b >= s.a)}
      </div>
      <div className="w-20 shrink-0 text-right text-[11px]">
        {!finished && (
          <span className={filled === match.playersPerSide * 2 ? 'text-brand' : 'text-muted'}>
            {filled}/{match.playersPerSide * 2} kişi
          </span>
        )}
        {finished && !revealed && (
          <span className={`rounded-full px-2 py-0.5 font-semibold ${needsMyVote ? 'bg-amber-100 text-amber-700' : 'bg-surface-2 text-muted'}`}>
            {needsMyVote ? 'Oy ver' : `Oylama ${prog.done.length}/${prog.total}`}
          </span>
        )}
        {finished && revealed && <span className="text-muted">Ratingler hazır</span>}
      </div>
    </Link>
  )
}
