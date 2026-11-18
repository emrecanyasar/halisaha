import type { AppData, Player, Position, ShirtSize } from '../types'
import { uid } from './utils'

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

/** İlk sürümlerdeki örnek (sahte) oyuncular. Sadece eski kayıtlardan temizlemek için tutuluyor. */
export const LEGACY_SAMPLE_NAMES = [
  'Emre Yılmaz', 'Burak Kaya', 'Mert Demir', 'Can Aydın', 'Oğuz Çelik', 'Kerem Şahin', 'Arda Öztürk',
  'Serkan Koç', 'Hakan Arslan', 'Tolga Doğan', 'Ufuk Kurt', 'Yusuf Polat', 'Barış Aksoy', 'Onur Erdem',
]
export const LEGACY_DEMO_EMAIL = 'can@halisaha.app'

/**
 * Örnek oyuncuları, sadece onların oynadığı maçları, ilgili oyları ve deneme hesabını siler.
 * Gerçek oyuncuların da yer aldığı maçlar korunur, örnek oyuncuların yerleri boşaltılır.
 */
export const withoutSamples = (d: AppData): AppData => {
  const sampleIds = new Set(d.players.filter((p) => LEGACY_SAMPLE_NAMES.some((n) => sameName(n, p.name))).map((p) => p.id))
  if (!sampleIds.size) return d
  const clean = (slots: (string | null)[]) => slots.map((s) => (s && sampleIds.has(s) ? null : s))
  const onlySamples = (m: AppData['matches'][number]) => {
    const ids = [...m.teamA.slots, ...m.teamB.slots].filter((x): x is string => !!x)
    return ids.length > 0 && ids.every((id) => sampleIds.has(id))
  }
  const matches = d.matches
    .filter((m) => !onlySamples(m))
    .map((m) => ({
      ...m,
      teamA: { ...m.teamA, slots: clean(m.teamA.slots) },
      teamB: { ...m.teamB, slots: clean(m.teamB.slots) },
      goals: m.goals.map((g) => ({
        ...g,
        scorerId: g.scorerId && sampleIds.has(g.scorerId) ? null : g.scorerId,
        assistId: g.assistId && sampleIds.has(g.assistId) ? null : g.assistId,
      })),
    }))
  const matchIds = new Set(matches.map((m) => m.id))
  return {
    ...d,
    players: d.players.filter((p) => !sampleIds.has(p.id)),
    matches,
    votes: d.votes.filter((v) => matchIds.has(v.matchId) && !sampleIds.has(v.voterId) && !sampleIds.has(v.targetId)),
    accounts: d.accounts.filter((a) => !sampleIds.has(a.playerId) && a.email !== LEGACY_DEMO_EMAIL),
    currentUserId: d.currentUserId && sampleIds.has(d.currentUserId) ? null : d.currentUserId,
  }
}

/** Yeni kurulum: sadece gerçek takım kadrosu, maç ve hesap yok. */
export const createSeedData = (): AppData => withRoster(emptyData())

export const emptyData = (): AppData => ({ version: 4, club: { name: CLUB_NAME }, accounts: [], players: [], matches: [], votes: [], currentUserId: null })
