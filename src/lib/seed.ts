import { ATTR_KEYS, type Account, type AppData, type ShirtSize, type Attributes, type Goal, type Match, type Player, type Position, type Vote } from '../types'
import { FORMATIONS } from './constants'
import { clamp, parseDate, seededRandom, toISODate, todayISO, uid } from './utils'

export const CLUB_NAME = 'Manchester United Siyah Elit'

/** Gerçek takım kadrosu: [isim, forma no, beden, mevki]. Mevkiler (kaleciler hariç) sonradan düzenlenebilir. */
export const ROSTER: [string, number, ShirtSize | undefined, Position][] = [
  ['H. Turan', 61, 'L', 'OS'],
  ['Bakar', 11, 'L', 'OS'],
  ['Nejdet', 56, 'L', 'OS'],
  ['Eren', 7, 'L', 'OS'],
  ['Barış', 87, 'L', 'OS'],
  ['Kadir', 8, 'L', 'OS'],
  ['Oz', 37, 'L', 'OS'],
  ['Turgut', 15, 'L', 'OS'],
  ['Demir', 9, 'L', 'OS'],
  ['Mert', 19, 'L', 'OS'],
  ['Kahraman', 18, 'XL', 'OS'],
  ['Emre Can', 13, 'XL', 'OS'],
  ['Enes', 10, 'XL', 'OS'],
  ['Salih', 6, 'XL', 'OS'],
  ['Alperen', 17, 'XL', 'KL'],
  ['Semih', 16, 'XL', 'OS'],
  ['Taştekin', 25, 'XL', 'KL'],
  ['Emre', 53, 'XL', 'OS'],
  ['Kor', 34, 'XXL', 'OS'],
  ['Zafer', 0, undefined, 'OS'],
  ['Caner', 0, undefined, 'OS'],
  ['Neşe', 0, undefined, 'KL'],
]

const sameName = (a: string, b: string) => a.toLocaleLowerCase('tr').replace(/\s+/g, ' ').trim() === b.toLocaleLowerCase('tr').replace(/\s+/g, ' ').trim()

/** Kadrodaki oyunculardan eksik olanları ekler (isimle karşılaştırır, var olanlara dokunmaz). */
export const withRoster = (d: AppData): AppData => {
  const now = new Date().toISOString()
  const missing = ROSTER.filter(([name]) => !d.players.some((p) => sameName(p.name, name)))
  if (!missing.length) return d
  return {
    ...d,
    players: [
      ...d.players,
      ...missing.map(([name, number, size, position]): Player => ({ id: uid(), name, number, size, position, foot: 'Sağ', createdAt: now })),
    ],
  }
}

export const DEMO_EMAIL = 'can@halisaha.app'
export const DEMO_PASSWORD = '123456'
/** sha256('halisaha:can@halisaha.app:123456') */
const DEMO_HASH = 'cde87ad24d8fae48b451edc761acbb2c36390abfbf8a9f89c7d34b4b505de012'

/** Deneme amaçlı örnek veri. Ayarlar > "Örnek veriyi yükle" ile tekrar yüklenebilir. */
const SEED_PLAYERS: [string, Position, number, Player['foot'], Partial<Attributes>][] = [
  ['Emre Yılmaz', 'KL', 1, 'Sağ', { savunma: 8, fizik: 7 }],
  ['Burak Kaya', 'DEF', 4, 'Sağ', { savunma: 8, fizik: 8, hucum: 5 }],
  ['Mert Demir', 'DEF', 5, 'Sol', { savunma: 7, pas: 7 }],
  ['Can Aydın', 'OS', 8, 'Sağ', { pas: 8, teknik: 8 }],
  ['Oğuz Çelik', 'OS', 6, 'Sağ', { savunma: 7, fizik: 8 }],
  ['Kerem Şahin', 'FV', 9, 'Sağ', { hucum: 9, teknik: 7 }],
  ['Arda Öztürk', 'FV', 10, 'Sol', { hucum: 8, teknik: 9, pas: 8 }],
  ['Serkan Koç', 'KL', 12, 'Sağ', { savunma: 7 }],
  ['Hakan Arslan', 'DEF', 3, 'Sağ', { savunma: 7, fizik: 7 }],
  ['Tolga Doğan', 'OS', 7, 'Sağ', { teknik: 7, pas: 7, fizik: 7 }],
  ['Ufuk Kurt', 'FV', 11, 'İki', { hucum: 7, fizik: 8 }],
  ['Yusuf Polat', 'OS', 14, 'Sol', { pas: 7 }],
  ['Barış Aksoy', 'DEF', 2, 'Sağ', { savunma: 6, fizik: 7 }],
  ['Onur Erdem', 'FV', 17, 'Sağ', { hucum: 7, teknik: 6 }],
]

export const createSeedData = (): AppData => {
  const rnd = seededRandom(42)
  const now = new Date().toISOString()
  const players: Player[] = SEED_PLAYERS.map(([name, position, number, foot]) => ({
    id: uid(), name, position, number, foot, createdAt: now,
  }))
  const talent = new Map(players.map((p, i) => [p.id, SEED_PLAYERS[i]![4]]))

  const daysFromToday = (n: number) => {
    const d = parseDate(todayISO())
    d.setDate(d.getDate() + n)
    return toISODate(d)
  }

  const makeMatch = (offset: number, perSide: number, aIdx: number[], bIdx: number[], finished: boolean): Match => {
    const formation = FORMATIONS[perSide]![0]!
    const slot = (idx: number[]) => {
      const s: (string | null)[] = idx.map((i) => players[i]!.id)
      while (s.length < perSide) s.push(null)
      return s
    }
    return {
      id: uid(),
      date: daysFromToday(offset),
      time: '21:00',
      venue: 'Yıldız Halı Saha · 2 No\'lu saha',
      playersPerSide: perSide,
      status: finished ? 'finished' : 'planned',
      teamA: { name: 'Kırmızılar', color: '#e11d48', formation, slots: slot(aIdx) },
      teamB: { name: 'Maviler', color: '#2563eb', formation, slots: slot(bIdx) },
      goals: [],
      votingClosed: finished,
      createdAt: now,
    }
  }

  const matches: Match[] = [
    makeMatch(-21, 7, [0, 1, 2, 3, 4, 5, 6], [7, 8, 12, 9, 11, 10, 13], true),
    makeMatch(-14, 7, [0, 8, 2, 9, 4, 6, 13], [7, 1, 12, 3, 11, 5, 10], true),
    makeMatch(-7, 7, [7, 1, 12, 3, 11, 6, 10], [0, 8, 2, 9, 4, 5, 13], true),
    makeMatch(-2, 7, [0, 1, 2, 3, 11, 5, 13], [7, 8, 12, 9, 4, 6, 10], false),
    makeMatch(3, 7, [0, 1, 2, 3, 4, 5, 6], [7, 8, 12, 9, 11, 10, 13], false),
  ]
  // Sonuncusu planlanmış; -2 günlük maç bitmiş ama oylaması açık
  matches[3]!.status = 'finished'

  const votes: Vote[] = []
  for (const m of matches.filter((x) => x.status === 'finished')) {
    const ids = [...m.teamA.slots, ...m.teamB.slots].filter((x): x is string => !!x)
    // Goller
    const goalCount = 3 + Math.floor(rnd() * 8)
    const goals: Goal[] = []
    for (let g = 0; g < goalCount; g++) {
      const team = rnd() < 0.5 ? 'A' : 'B'
      const pool = (team === 'A' ? m.teamA : m.teamB).slots.filter((x): x is string => !!x).slice(1)
      const weighted = pool.flatMap((id) => {
        const t = talent.get(id)?.hucum ?? 5
        return Array(Math.max(1, t - 4)).fill(id) as string[]
      })
      const scorerId = weighted[Math.floor(rnd() * weighted.length)]!
      const others = pool.filter((x) => x !== scorerId)
      goals.push({ id: uid(), team, scorerId, assistId: rnd() < 0.6 ? others[Math.floor(rnd() * others.length)]! : null })
    }
    m.goals = goals
    const isOpen = !m.votingClosed
    for (const voter of ids) {
      if (isOpen && rnd() < 0.4) continue // açık oylamada bazıları henüz oy vermemiş olsun
      for (const target of ids) {
        if (target === voter) continue
        const t = talent.get(target) ?? {}
        const base = 6 + rnd() * 1.5 + goals.filter((g) => g.scorerId === target).length * 0.5
        const rating = clamp(Math.round(base * 2) / 2, 1, 10)
        const attrs = Object.fromEntries(
          ATTR_KEYS.map((k) => [k, clamp(Math.round((t[k] ?? 6) + (rnd() * 2 - 1)), 1, 10)]),
        ) as Attributes
        votes.push({ id: uid(), matchId: m.id, voterId: voter, targetId: target, rating, attrs, createdAt: now })
      }
    }
  }

  // Deneme hesabı: can@halisaha.app / 123456
  const accounts: Account[] = [
    { id: uid(), email: DEMO_EMAIL, passwordHash: DEMO_HASH, playerId: players[3]!.id, createdAt: now },
  ]
  return withRoster({ version: 3, club: { name: CLUB_NAME }, accounts, players, matches, votes, currentUserId: null })
}

export const emptyData = (): AppData => ({ version: 3, club: { name: CLUB_NAME }, accounts: [], players: [], matches: [], votes: [], currentUserId: null })
