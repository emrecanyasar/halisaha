import { type AppData, type Attributes, type Match, type Player, type TeamSide, type Vote } from '../types'
import { avg, round1 } from './utils'
import { overallOf, ratingHistory, voteScore } from './rating'

export const teamPlayers = (m: Match, side: TeamSide) =>
  (side === 'A' ? m.teamA : m.teamB).slots.filter((s): s is string => !!s)

export const participants = (m: Match) => [...teamPlayers(m, 'A'), ...teamPlayers(m, 'B')]

export const sideOf = (m: Match, playerId: string): TeamSide | null =>
  m.teamA.slots.includes(playerId) ? 'A' : m.teamB.slots.includes(playerId) ? 'B' : null

export const score = (m: Match) => ({
  a: m.goals.filter((g) => g.team === 'A').length,
  b: m.goals.filter((g) => g.team === 'B').length,
})

export const matchVotes = (votes: Vote[], matchId: string) => votes.filter((v) => v.matchId === matchId)

/** Oy durumu: kim oyunu tamamladı? (Kimin kime ne verdiği asla gösterilmez) */
export const votingProgress = (m: Match, votes: Vote[]) => {
  const ps = participants(m)
  const mv = matchVotes(votes, m.id)
  const done = ps.filter((voter) => {
    const targets = new Set(mv.filter((v) => v.voterId === voter).map((v) => v.targetId))
    return ps.every((t) => t === voter || targets.has(t))
  })
  return { total: ps.length, done, complete: ps.length > 1 && done.length === ps.length }
}

/** Sonuçlar açık mı? Oylama kapatıldıysa ya da herkes oy verdiyse. */
export const isRevealed = (m: Match, votes: Vote[]) =>
  m.status === 'finished' && (m.votingClosed || votingProgress(m, votes).complete)

export interface MatchRating {
  playerId: string
  rating: number
  votes: number
}

/** Maç ratingleri: oyuncuya verilen oyların (5 özelliğin ortalaması) ortalaması. Sonuçlar açılmadıysa boş döner. */
export const matchRatings = (m: Match, votes: Vote[]): Map<string, MatchRating> => {
  const out = new Map<string, MatchRating>()
  if (!isRevealed(m, votes)) return out
  const mv = matchVotes(votes, m.id)
  for (const pid of participants(m)) {
    const received = mv.filter((v) => v.targetId === pid)
    if (!received.length) continue
    out.set(pid, { playerId: pid, rating: round1(avg(received.map((v) => voteScore(v.attrs)))), votes: received.length })
  }
  return out
}

export const matchMvp = (m: Match, votes: Vote[]) => {
  let best: MatchRating | null = null
  for (const r of matchRatings(m, votes).values()) if (!best || r.rating > best.rating) best = r
  return best
}

/**
 * Oyuncu özellikleri (0-99): ilk değerlendirmeden gelen başlangıç kartı,
 * her 5 maçlık dönemde maç oylarına göre güncellenir (bkz. rating.ts).
 */
export const playerAttributes = (data: AppData, playerId: string): { attrs: Attributes; votes: number } | null => {
  const h = ratingHistory(data, playerId)
  return h.current ? { attrs: h.current, votes: h.votes } : null
}

export const overall = overallOf

export interface PlayerSummary {
  player: Player
  matches: number
  wins: number
  draws: number
  losses: number
  goals: number
  assists: number
  mvps: number
  avgRating: number | null
  ovr: number | null
  attrs: Attributes | null
  /** Özellikleri oluşturan oy sayısı */
  attrVotes: number
  form: { match: Match; rating: number | null; result: 'G' | 'B' | 'M' }[]
}

export const playerSummary = (data: AppData, player: Player): PlayerSummary => {
  const finished = data.matches
    .filter((m) => m.status === 'finished' && participants(m).includes(player.id))
    .sort((a, b) => (a.date + a.time < b.date + b.time ? -1 : 1))
  let wins = 0, draws = 0, losses = 0, mvps = 0
  const ratings: number[] = []
  const form: PlayerSummary['form'] = []
  for (const m of finished) {
    const s = score(m)
    const side = sideOf(m, player.id)!
    const mine = side === 'A' ? s.a : s.b
    const theirs = side === 'A' ? s.b : s.a
    const result = mine > theirs ? 'G' : mine === theirs ? 'B' : 'M'
    if (result === 'G') wins++
    else if (result === 'B') draws++
    else losses++
    const r = matchRatings(m, data.votes).get(player.id)?.rating ?? null
    if (r != null) ratings.push(r)
    if (matchMvp(m, data.votes)?.playerId === player.id) mvps++
    form.push({ match: m, rating: r, result })
  }
  const goals = finished.flatMap((m) => m.goals).filter((g) => g.scorerId === player.id).length
  const assists = finished.flatMap((m) => m.goals).filter((g) => g.assistId === player.id).length
  const pa = playerAttributes(data, player.id)
  return {
    player,
    matches: finished.length,
    wins, draws, losses, goals, assists, mvps,
    avgRating: ratings.length ? round1(avg(ratings)) : null,
    ovr: pa ? overall(pa.attrs) : null,
    attrs: pa?.attrs ?? null,
    attrVotes: pa?.votes ?? 0,
    form,
  }
}

/**
 * Dengeli takım kurma: oyuncuları güce göre sıralayıp yılan (snake) usulü dağıtır,
 * sonra her takımda kaleciyi ilk slota, diğerlerini mevkiye göre dizer.
 */
export const balanceTeams = (data: AppData, ids: string[], perSide: number) => {
  const strength = (id: string) => {
    const s = playerSummary(data, data.players.find((p) => p.id === id)!)
    return s.ovr ?? (s.avgRating != null ? s.avgRating * 10 : 60)
  }
  const sorted = [...ids].sort((a, b) => strength(b) - strength(a))
  const A: string[] = [], B: string[] = []
  sorted.forEach((id, i) => {
    const pick = i % 4 === 0 || i % 4 === 3 ? A : B
    const other = pick === A ? B : A
    ;(pick.length < perSide ? pick : other).push(id)
  })
  const order = { KL: 0, SAV: 1, OS: 2, ATK: 3 } as const
  const arrange = (team: string[]) => {
    const ps = team.map((id) => data.players.find((p) => p.id === id)!)
    ps.sort((a, b) => order[a.position] - order[b.position])
    const slots: (string | null)[] = ps.map((p) => p.id)
    while (slots.length < perSide) slots.push(null)
    return slots
  }
  return { a: arrange(A), b: arrange(B) }
}
