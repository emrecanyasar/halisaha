import type { AppData, Group, Player, Position, ShirtSize } from '../types'
import { uid } from './utils'
import { newInviteCode } from './groups'
import { withDemoGroups } from './demo'

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

/**
 * Deneme için önceden açılmış hesaplar: [kadrodaki isim, e-posta, sha256('halisaha:<e-posta>:<şifre>')].
 * Şifreler: emrecan@halisaha.app → 123456
 */
const PRESET_ACCOUNTS: [string, string, string][] = [
  ['Emre Can', 'emrecan@halisaha.app', '7a2e5c457e7674fcbe574c48f4a43862bd99440fd7874d742795f415ade3bd4f'],
]

/** Hazır hesapları ekler: oyuncu kadroda varsa, ona bağlı hesap yoksa ve e-posta boştaysa. */
export const withPresetAccounts = (d: AppData): AppData => {
  const now = new Date().toISOString()
  const add: AppData['accounts'] = []
  for (const [name, email, passwordHash] of PRESET_ACCOUNTS) {
    const player = d.players.find((p) => sameName(p.name, name))
    if (!player) continue
    if (d.accounts.some((a) => a.playerId === player.id || a.email === email)) continue
    add.push({ id: uid(), email, passwordHash, playerId: player.id, createdAt: now })
  }
  return add.length ? { ...d, accounts: [...d.accounts, ...add] } : d
}

/** 19 Kasım MANU – BAY maçı: [isim, x%, y%] — ekran görüntüsündeki dizilişle */
const MANU_BAY = {
  date: '2026-11-19',
  time: '19:00',
  venue: 'Haldun Alagaş Spor Kompleksi',
  perSide: 8,
  formation: [1, 3, 3, 1],
  // A takımı (alt yarı): kaleci, 3 defans, 3 orta saha, 1 forvet
  manu: [
    ['Neşe', 49.9, 91.0],
    ['H. Turan', 24.9, 79.7], ['Emre Can', 49.9, 79.4], ['Bakar', 73.5, 80.0],
    ['Caner', 26.5, 67.2], ['Nejdet', 49.9, 67.8], ['Barış', 75.1, 67.8],
    ['Demir', 49.9, 54.8],
  ] as [string, number, number][],
  // B takımı (üst yarı)
  bay: [
    ['Alperen', 49.9, 6.2],
    ['Kadir', 19.1, 19.7], ['Turgut', 49.9, 16.4], ['Zafer', 79.8, 19.7],
    ['Enes', 32.6, 42.9], ['Salih', 50.3, 27.2], ['Oz', 65.2, 43.5],
    ['Eren', 49.7, 37.1],
  ] as [string, number, number][],
}

/**
 * MANU – BAY maçını kaydeder. Aynı gün MANU'nun bir maçı ya da aynı sahada bir maç varsa
 * onu bu kadroyla günceller (kimliği ve durumu korunur), yoksa yeni maç ekler.
 */
export const withPresetMatch = (d: AppData): AppData => {
  const P = MANU_BAY
  const byName = (n: string) => d.players.find((p) => sameName(p.name, n))?.id ?? null
  const team = (name: string, color: string, rows: [string, number, number][]) => ({
    name,
    color,
    formation: P.formation,
    slots: rows.map(([n]) => byName(n)),
    positions: rows.map(([, x, y]) => ({ x, y })),
  })
  const teamA = team('MANU', '#111827', P.manu)
  const teamB = team('BAY', '#f8fafc', P.bay)
  const existing = d.matches.find(
    (m) => m.date === P.date && (sameName(m.teamA.name, 'MANU') || sameName(m.venue, P.venue)),
  )
  if (existing) {
    if (existing.status !== 'planned') return d
    return {
      ...d,
      matches: d.matches.map((m) =>
        m.id === existing.id ? { ...m, time: P.time, venue: P.venue, playersPerSide: P.perSide, teamA, teamB } : m,
      ),
    }
  }
  return {
    ...d,
    matches: [
      ...d.matches,
      {
        id: uid(),
        groupId: d.groups?.find((g) => !g.demo)?.id ?? '',
        date: P.date,
        time: P.time,
        venue: P.venue,
        playersPerSide: P.perSide,
        status: 'planned',
        teamA,
        teamB,
        goals: [],
        votingClosed: false,
        createdAt: new Date().toISOString(),
      },
    ],
  }
}

/**
 * Tek kulüplü eski yapıdan gruba geçiş: örnek olmayan tüm oyuncular ilk grubun üyesi olur,
 * hesabı olanlar yönetici olur (eskiden herkes her şeyi düzenleyebiliyordu). Grubu olmayan maçlar bu gruba bağlanır.
 */
export const withMainGroup = (d: AppData, name = CLUB_NAME): AppData => {
  if (d.groups.some((g) => !g.demo)) return d
  const memberIds = d.players.filter((p) => !p.id.startsWith('demo-')).map((p) => p.id)
  const withAccount = memberIds.filter((id) => d.accounts.some((a) => a.playerId === id))
  const group: Group = {
    id: uid(),
    name,
    inviteCode: newInviteCode(),
    adminIds: withAccount.length ? withAccount : memberIds.slice(0, 1),
    memberIds,
    isPublic: true,
    createdAt: new Date().toISOString(),
  }
  return {
    ...d,
    groups: [group, ...d.groups],
    matches: d.matches.map((m) => (m.groupId ? m : { ...m, groupId: group.id })),
  }
}

/** Yeni kurulum: gerçek takım kadrosu, hazır deneme hesapları, ilk grup, planlanan MANU – BAY maçı ve örnek gruplar. */
export const createSeedData = (): AppData => withDemoGroups(withPresetMatch(withMainGroup(withPresetAccounts(withRoster(emptyData())))))

export const emptyData = (): AppData => ({ version: 8, groups: [], opponentAds: [], accounts: [], players: [], matches: [], votes: [], currentUserId: null })
