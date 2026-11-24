import type { AppData, Attendance, FeeSplit, Goal, Group, Match, OpponentAd, OpponentLevel, Player, Position } from '../types'
import { FORMATIONS } from './constants'
import { parseDate, seededRandom, todayISO, toISODate } from './utils'

/**
 * Örnek (demo) gruplar: ana sayfada başka grupların da maçları görünsün diye.
 * Deneme sürümünde ortak sunucu olmadığı için her açılışta bugüne göre yeniden üretilir;
 * böylece tarihler eskimez. Kimlikler "demo-" ile başlar, kullanıcı verisine karışmaz.
 */

type Row = [dayOffset: number, time: string, teamA: [string, string], teamB: [string, string], scoreOrSignedUp: [number, number] | number]
interface DemoGroup {
  name: string
  venue: string
  perSide: number
  matches: Row[]
}

const GROUPS: DemoGroup[] = [
  {
    name: 'Kadıköy Perşembe Ligi',
    venue: 'Fenerbahçe Halı Saha',
    perSide: 7,
    matches: [
      [-1, '21:00', ['Sarılar', '#eab308'], ['Laciler', '#1e3a8a'], [5, 4]],
      [-8, '21:00', ['Sarılar', '#eab308'], ['Laciler', '#1e3a8a'], [4, 2]],
      [3, '21:00', ['Sarılar', '#eab308'], ['Laciler', '#1e3a8a'], 9],
    ],
  },
  {
    name: 'Beşiktaş Ofis Takımı',
    venue: 'Barbaros Spor Tesisi',
    perSide: 6,
    matches: [
      [-1, '20:00', ['Yazılım', '#0f172a'], ['Satış', '#dc2626'], [3, 6]],
      [0, '20:00', ['Yazılım', '#0f172a'], ['Pazarlama', '#0891b2'], 11],
    ],
  },
  {
    name: 'Ataşehir Pazar Maçı',
    venue: 'Ataşehir Arena',
    perSide: 7,
    matches: [
      [-2, '10:00', ['Yeşiller', '#16a34a'], ['Beyazlar', '#f8fafc'], [7, 7]],
      [6, '10:00', ['Yeşiller', '#16a34a'], ['Beyazlar', '#f8fafc'], 6],
    ],
  },
  {
    name: 'Üsküdar Gençlik',
    venue: 'Çamlıca Halı Saha',
    perSide: 8,
    matches: [
      [-3, '22:00', ['Kırmızı', '#b91c1c'], ['Mavi', '#2563eb'], [2, 3]],
      [1, '22:00', ['Kırmızı', '#b91c1c'], ['Mavi', '#2563eb'], 14],
    ],
  },
  {
    name: 'Maltepe Veteranlar',
    venue: 'Maltepe Sahil Tesisleri',
    perSide: 6,
    matches: [
      [-5, '19:00', ['Tecrübe', '#7c3aed'], ['Kondisyon', '#f97316'], [1, 1]],
      [4, '19:00', ['Tecrübe', '#7c3aed'], ['Kondisyon', '#f97316'], 12],
    ],
  },
]

const FIRST = ['Ali', 'Burak', 'Cem', 'Deniz', 'Efe', 'Fatih', 'Gökhan', 'Hasan', 'İlker', 'Kaan', 'Levent', 'Murat', 'Nihat', 'Onur', 'Ozan', 'Recep', 'Selim', 'Tarık', 'Umut', 'Volkan', 'Yasin', 'Zeki', 'Serdar', 'Koray']
const LAST = ['A.', 'B.', 'Ç.', 'D.', 'E.', 'G.', 'K.', 'Ö.', 'S.', 'T.', 'Y.']

const shiftDays = (iso: string, days: number) => {
  const d = parseDate(iso)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

export const DEMO_PREFIX = 'demo-'

/** Kullanıcının verisinden eski örnekleri temizleyip bugüne göre yenilerini ekler. */
export const withDemoGroups = (d: AppData): AppData => {
  const isDemoGroup = (id: string) => id.startsWith(DEMO_PREFIX)
  const base: AppData = {
    ...d,
    groups: d.groups.filter((g) => !g.demo),
    players: d.players.filter((p) => !p.id.startsWith(DEMO_PREFIX)),
    matches: d.matches.filter((m) => !isDemoGroup(m.groupId)),
    votes: d.votes.filter((v) => !v.matchId.startsWith(DEMO_PREFIX)),
    opponentAds: (d.opponentAds ?? []).filter((a) => !a.id.startsWith(DEMO_PREFIX)),
  }
  const today = todayISO()
  const now = new Date().toISOString()
  const groups: Group[] = []
  const players: Player[] = []
  const matches: Match[] = []

  GROUPS.forEach((G, gi) => {
    const rnd = seededRandom(1000 + gi * 77)
    const gid = `${DEMO_PREFIX}g${gi}`
    const count = G.perSide * 2 + 2
    const members: Player[] = Array.from({ length: count }, (_, i) => {
      const pos: Position = i === 0 || i === G.perSide ? 'KL' : (['DEF', 'OS', 'FV'] as Position[])[i % 3]!
      return {
        id: `${DEMO_PREFIX}${gi}-${i}`,
        name: `${FIRST[(i * 7 + gi * 5) % FIRST.length]} ${LAST[(i + gi * 3) % LAST.length]}`,
        position: pos,
        number: ((i * 13 + gi) % 98) + 1,
        foot: 'Sağ',
        createdAt: now,
      }
    })
    players.push(...members)
    groups.push({
      id: gid,
      name: G.name,
      inviteCode: '',
      adminIds: [members[0]!.id],
      memberIds: members.map((p) => p.id),
      isPublic: true,
      demo: true,
      createdAt: now,
    })

    G.matches.forEach(([offset, time, [aName, aColor], [bName, bColor], extra], mi) => {
      const finished = offset < 0
      const n = G.perSide
      const formation = FORMATIONS[n]![0]!
      const ids = members.map((p) => p.id)
      // A: 0..n-1, B: n..2n-1 (kaleciler ilk slotta)
      let slotsA: (string | null)[] = ids.slice(0, n)
      let slotsB: (string | null)[] = ids.slice(n, 2 * n)
      const attendance: Record<string, Attendance> = {}
      if (!finished && typeof extra === 'number') {
        // Yazılan kişi kadar slot dolu (iki takıma yarı yarıya), onlar "geliyorum" demiş
        const keepA = Math.ceil(extra / 2)
        const keepB = Math.floor(extra / 2)
        slotsA = slotsA.map((id, i) => (i < keepA ? id : null))
        slotsB = slotsB.map((id, i) => (i < keepB ? id : null))
        ;[...slotsA, ...slotsB].forEach((id) => id && (attendance[id] = 'yes'))
        attendance[ids[ids.length - 1]!] = 'no'
      }
      const goals: Goal[] = []
      if (finished && Array.isArray(extra)) {
        const pick = (team: (string | null)[]) => team[1 + Math.floor(rnd() * (team.length - 1))] ?? null
        for (let i = 0; i < extra[0]; i++) goals.push({ id: `${gid}-${mi}-a${i}`, team: 'A', scorerId: pick(slotsA), assistId: rnd() > 0.5 ? pick(slotsA) : null })
        for (let i = 0; i < extra[1]; i++) goals.push({ id: `${gid}-${mi}-b${i}`, team: 'B', scorerId: pick(slotsB), assistId: rnd() > 0.5 ? pick(slotsB) : null })
        goals.forEach((g) => g.assistId === g.scorerId && (g.assistId = null))
      }
      matches.push({
        id: `${DEMO_PREFIX}m${gi}-${mi}`,
        groupId: gid,
        date: shiftDays(today, offset),
        time,
        venue: G.venue,
        playersPerSide: n,
        status: finished ? 'finished' : 'planned',
        teamA: { name: aName, color: aColor, formation, slots: slotsA },
        teamB: { name: bName, color: bColor, formation, slots: slotsB },
        goals,
        // Örnek maçlarda oylama yapılmadığı için oylama kapalı sayılır
        votingClosed: finished,
        attendance: finished ? undefined : attendance,
        createdAt: now,
      })
    })
  })

  // Örnek rakip ilanları (telefonlar örnek, aranamaz)
  const ADS: [groupIndex: number, dayOffset: number, time: string, perSide: number, level: OpponentLevel, fee: FeeSplit, note: string][] = [
    [0, 2, '22:00', 7, 'orta', 'yari', 'Saha ayarlı, sadece rakip eksik. Centilmen bir maç arıyoruz.'],
    [1, 3, '20:00', 6, 'amator', 'kaybeden', 'Ofis takımıyız, keyif için oynuyoruz.'],
    [3, 5, '23:00', 8, 'iyi', 'yari', 'Tempolu oynuyoruz, kaleciniz olsun lütfen.'],
    [4, 6, '18:00', 6, 'amator', 'biz', 'Saha bizden, sadece gelin oynayalım.'],
  ]
  const ads: OpponentAd[] = ADS.map(([gi, offset, time, perSide, level, feeSplit, note], i) => ({
    id: `${DEMO_PREFIX}ad${i}`,
    ownerId: groups[gi]!.adminIds[0]!,
    groupId: groups[gi]!.id,
    teamName: groups[gi]!.name,
    date: shiftDays(today, offset),
    time,
    venue: GROUPS[gi]!.venue,
    playersPerSide: perSide,
    level,
    feeSplit,
    phone: `0500 000 00 0${i + 1}`,
    note,
    status: 'open',
    createdAt: now,
  }))

  return {
    ...base,
    opponentAds: [...base.opponentAds, ...ads],
    groups: [...base.groups, ...groups],
    players: [...base.players, ...players],
    matches: [...base.matches, ...matches],
  }
}
