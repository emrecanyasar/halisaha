import { ATTR_KEYS, type AppData, type Attributes, type Match, type Vote } from '../types'
import { serverAggregates } from './server'

/**
 * Rating sistemi
 * 1. Ana rating: grup arkadaşları yeni üyenin 5 özelliğini gizlice puanlar (BaseVote).
 *    En az BASE_REQUIRED değerlendirme gelince kart açılır.
 * 2. Maç puanı: maçtan sonra oyuncular yine 5 özelliği puanlar; maç puanı bu beşinin ortalaması.
 * 3. Dönem: her PERIOD maçta bir, dönemin ortalaması kartla karşılaştırılır. Her özellik
 *    farkın STEP katı kadar artar ya da azalır; bir dönemde en fazla ±CAP.
 */
export const PERIOD = 5
export const STEP = 0.5
export const CAP = 4
export const BASE_REQUIRED = 3

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)
/** -3,5 → -4 (Math.round yukarı yuvarlar, iki yönde aynı davransın) */
const roundSym = (x: number) => Math.sign(x) * Math.round(Math.abs(x))
const clampAttr = (v: number) => Math.max(1, Math.min(99, v))

/** Bir oydaki 5 özelliğin ortalaması (1-10): maç puanı */
export const voteScore = (attrs: Attributes) => mean(ATTR_KEYS.map((k) => attrs[k]))

export const overallOf = (attrs: Attributes) => Math.round(mean(ATTR_KEYS.map((k) => attrs[k])))

const meanAttrs = (list: Attributes[], scale = 1): Attributes =>
  Object.fromEntries(ATTR_KEYS.map((k) => [k, mean(list.map((a) => a[k])) * scale])) as Attributes

const roundAttrs = (a: Attributes): Attributes => Object.fromEntries(ATTR_KEYS.map((k) => [k, clampAttr(Math.round(a[k]))])) as Attributes

/** Sonuçları açılmış mı? (stats.ts'e döngüsel bağımlılık olmasın diye burada da var) */
const participantsOf = (m: Match) => [...m.teamA.slots, ...m.teamB.slots].filter((s): s is string => !!s)
const revealed = (m: Match, votes: Vote[]) => {
  if (m.status !== 'finished') return false
  if (m.votingClosed) return true
  const srv = serverAggregates()?.matchStats[m.id]
  if (srv) return srv.revealed
  const ps = participantsOf(m)
  if (ps.length < 2) return false
  const mv = votes.filter((v) => v.matchId === m.id)
  return ps.every((voter) => ps.every((t) => t === voter || mv.some((v) => v.voterId === voter && v.targetId === t)))
}

/** Oyuncuyu değerlendirebilecek grup arkadaşı sayısına göre gereken değerlendirme sayısı */
export const baseRequired = (data: AppData, playerId: string) => {
  const srv = serverAggregates()?.base[playerId]
  if (srv) return srv.required
  const mates = new Set<string>()
  for (const g of data.groups) if (g.memberIds.includes(playerId)) g.memberIds.forEach((id) => id !== playerId && mates.add(id))
  return Math.max(1, Math.min(BASE_REQUIRED, mates.size))
}

export interface RatingPeriod {
  index: number
  from: Attributes
  to: Attributes
  matchIds: string[]
  /** Dönemdeki maç puanlarının ortalaması (1-10) */
  avg: number
}

export interface RatingHistory {
  /** Başlangıç kartı (0-99); null = kart henüz açılmadı */
  base: Attributes | null
  baseSource: 'degerlendirme' | 'maclar' | null
  baseCount: number
  baseRequired: number
  periods: RatingPeriod[]
  current: Attributes | null
  /** Bir sonraki güncellemeye sayılacak maçlar */
  pending: string[]
  pendingAvg: number | null
  /** Karta yansıyan toplam oy sayısı (ilk değerlendirme + maç oyları) */
  votes: number
}

export const ratingHistory = (data: AppData, playerId: string): RatingHistory => {
  const player = data.players.find((p) => p.id === playerId)
  // Oy almış, sonuçları açılmış maçlar (eskiden yeniye)
  const srv = serverAggregates()
  // Veritabanı modunda oylar gelmez; maç başına ortalamalar sunucudan gelir
  const entries = srv
    ? [...(srv.averages[playerId] ?? [])]
        .sort((a, b) => (a.date + a.time < b.date + b.time ? -1 : 1))
        .map((e) => ({ id: e.matchId, attrs: e.attrs, votes: e.votes }))
    : data.matches
        .filter((m) => participantsOf(m).includes(playerId) && revealed(m, data.votes))
        .sort((a, b) => (a.date + a.time < b.date + b.time ? -1 : 1))
        .map((m) => ({ m, received: data.votes.filter((v) => v.matchId === m.id && v.targetId === playerId) }))
        .filter((e) => e.received.length > 0)
        .map((e) => ({ id: e.m.id, attrs: meanAttrs(e.received.map((v) => v.attrs)), votes: e.received.length }))

  const srvBase = srv?.base[playerId]
  const baseVotes = srv ? [] : (data.baseVotes ?? []).filter((v) => v.targetId === playerId && v.attrs).map((v) => v.attrs!)
  const baseCount = srvBase ? srvBase.count : baseVotes.length
  const required = baseRequired(data, playerId)
  let base: Attributes | null = null
  let baseSource: RatingHistory['baseSource'] = null
  let queue = entries
  let votes = 0
  if (srvBase?.attrs) {
    base = roundAttrs(Object.fromEntries(ATTR_KEYS.map((k) => [k, srvBase.attrs![k] * 10])) as Attributes)
    baseSource = 'degerlendirme'
    votes += srvBase.count
  } else if (!srv && baseVotes.length >= required) {
    base = roundAttrs(meanAttrs(baseVotes, 10))
    baseSource = 'degerlendirme'
    votes += baseVotes.length
  } else if (player?.legacyRating && entries.length) {
    // Eski oyuncu: başlangıç kartı ilk dönemin maç oylarından
    const first = entries.slice(0, PERIOD)
    base = roundAttrs(meanAttrs(first.map((e) => e.attrs), 10))
    baseSource = 'maclar'
    votes += first.reduce((s, e) => s + e.votes, 0)
    queue = entries.slice(first.length)
  }

  const periods: RatingPeriod[] = []
  let cur = base
  if (cur) {
    for (let i = 0; i + PERIOD <= queue.length; i += PERIOD) {
      const chunk = queue.slice(i, i + PERIOD)
      const avg = meanAttrs(chunk.map((e) => e.attrs), 10)
      const from: Attributes = cur
      const to = Object.fromEntries(
        ATTR_KEYS.map((k) => [k, clampAttr(from[k] + Math.max(-CAP, Math.min(CAP, roundSym((avg[k] - from[k]) * STEP))))]),
      ) as Attributes
      periods.push({ index: periods.length + 1, from, to, matchIds: chunk.map((e) => e.id), avg: mean(chunk.map((e) => voteScore(e.attrs))) })
      votes += chunk.reduce((s, e) => s + e.votes, 0)
      cur = to
    }
  }
  const pendingEntries = base ? queue.slice(periods.length * PERIOD) : entries
  return {
    base,
    baseSource,
    baseCount,
    baseRequired: required,
    periods,
    current: cur,
    pending: pendingEntries.map((e) => e.id),
    pendingAvg: pendingEntries.length ? mean(pendingEntries.map((e) => voteScore(e.attrs))) : null,
    votes,
  }
}

/** "Henüz izlemedim" diye geçilen oyuncu, birlikte bu kadar maç yapılınca yeniden sorulur */
export const WATCH_AFTER = 2

const myBaseVote = (data: AppData, voterId: string, targetId: string) =>
  (data.baseVotes ?? []).find((v) => v.voterId === voterId && v.targetId === targetId)

/** Geçtikten sonra birlikte oynanan (bitmiş) maç sayısı */
const matchesTogetherSince = (data: AppData, a: string, b: string, sinceIso: string) => {
  const since = sinceIso.slice(0, 10)
  return data.matches.filter((m) => {
    if (m.status !== 'finished' || m.date < since) return false
    const ps = participantsOf(m)
    return ps.includes(a) && ps.includes(b)
  }).length
}

/**
 * Benim ilk değerlendirmemi bekleyen grup arkadaşları (kartı henüz açılmamış olanlar).
 * - waiting: hiç değerlendirmediklerim (kartı açılmamışsa) + geçtikten sonra birlikte WATCH_AFTER maç yaptıklarım
 * - skipped: geçtiğim, henüz yeniden sorulmayanlar (istersem şimdi değerlendirebilirim)
 */
export const baseVoteQueue = (data: AppData, me: string | null, groupId?: string) => {
  const waiting: string[] = []
  const skipped: string[] = []
  if (!me) return { waiting, skipped }
  const seen = new Set<string>()
  for (const g of data.groups) {
    if (g.demo || !g.memberIds.includes(me) || (groupId && g.id !== groupId)) continue
    for (const id of g.memberIds) {
      if (id === me || seen.has(id)) continue
      seen.add(id)
      const mine = myBaseVote(data, me, id)
      if (mine?.attrs) continue
      // Kartı açılmış oyuncu yeni baştan sorulmaz; ama daha önce "sonra" diye geçtiysem yine sorulur
      // (verdiğim puan başlangıç kartının ortalamasına eklenir)
      if (!mine && ratingHistory(data, id).base) continue
      if (!mine || matchesTogetherSince(data, me, id, mine.createdAt) >= WATCH_AFTER) waiting.push(id)
      else skipped.push(id)
    }
  }
  return { waiting, skipped }
}

export const pendingBaseTargets = (data: AppData, me: string | null, groupId?: string) => baseVoteQueue(data, me, groupId).waiting
