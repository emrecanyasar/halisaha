import { ATTR_KEYS, type AttrKey, type Match, type Player, type Team } from '../types'
import { FORMATIONS, TEAM_COLORS } from './constants'
import { uid } from './utils'

/**
 * Kadro Kurucu (giriş gerektirmeyen araç) için saf yardımcılar.
 * Veriler store'a yazılmaz; tarayıcı taslağında ve paylaşım linkinde tutulur.
 */

export interface LineupPlayer {
  id: string
  name: string
  /** 0 = puan verilmedi, 1-5 yıldız */
  stars: number
  gk: boolean
  /** İsteğe bağlı ayrıntılar (1-10, 0/eksik = girilmedi). Girildiyse yıldız yerine bunlar kullanılır. */
  attrs?: Partial<Record<AttrKey, number>>
}

export interface LineupState {
  /** Ayrıntı ölçeği; eski taslaklarda yok (1-5 idi) */
  scale?: 10
  perSide: number
  players: LineupPlayer[]
  teamA: Team
  teamB: Team
}

const emptyTeam = (name: string, color: string, perSide: number): Team => ({
  name,
  color,
  formation: FORMATIONS[perSide]![0]!,
  slots: Array(perSide).fill(null),
  positions: [],
})

export const newLineup = (perSide = 7): LineupState => ({
  scale: 10,
  perSide,
  players: [],
  teamA: emptyTeam('Beyazlar', TEAM_COLORS[6]!, perSide),
  teamB: emptyTeam('Kırmızılar', TEAM_COLORS[0]!, perSide),
})

/** Satır satır ya da virgülle yazılmış isimleri ayıklar ("1. Ahmet", "- Mehmet" gibi önekleri temizler). */
export const parseNames = (text: string) =>
  text
    .split(/[\n,;]+/)
    .map((s) => s.replace(/^\s*(\d+[.)-]?|[-*•])\s*/, '').trim())
    .filter((s) => s.length > 0)
    .map((s) => s.slice(0, 24))

export const makePlayer = (name: string): LineupPlayer => ({ id: uid(), name, stars: 0, gk: false })

const shuffle = <T,>(xs: T[]) => {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

/** Sahada olmayan oyuncular (yedekler) */
export const benchOf = (s: LineupState) => {
  const on = new Set([...s.teamA.slots, ...s.teamB.slots].filter(Boolean))
  return s.players.filter((p) => !on.has(p.id))
}

/** Oyuncunun girilmiş ayrıntıları (1-5). Hiç girilmediyse null. */
export const attrsOf = (p: LineupPlayer): Partial<Record<AttrKey, number>> | null => {
  const a = p.attrs
  if (!a) return null
  return ATTR_KEYS.some((k) => (a[k] ?? 0) > 0) ? a : null
}

/** Genel güç (1-10): ayrıntı varsa onların ortalaması, yoksa yıldız x2, o da yoksa 6. */
export const powerOf = (p: LineupPlayer) => {
  const a = attrsOf(p)
  if (a) {
    const xs = ATTR_KEYS.map((k) => a[k] ?? 0).filter((v) => v > 0)
    return xs.reduce((x, y) => x + y, 0) / xs.length
  }
  return p.stars ? p.stars * 2 : 6
}

/** Eski (1-5 ölçekli) taslakları 10'luk ölçeğe çevirir. */
export const normalizeLineup = (s: LineupState): LineupState =>
  s.scale === 10
    ? s
    : {
        ...s,
        scale: 10,
        players: s.players.map((p) =>
          p.attrs ? { ...p, attrs: Object.fromEntries(ATTR_KEYS.map((k) => [k, Math.min(10, (p.attrs![k] ?? 0) * 2)])) } : p,
        ),
      }

/** 1-10 puan rengi (kırmızı → turuncu → sarı → yeşil → turkuaz → mavi) */
export const scoreColor = (v: number) =>
  v <= 0 ? '#e2e8f0' : v <= 3 ? '#dc2626' : v <= 5 ? '#ea7c0c' : v < 6.5 ? '#d9af00' : v < 7.5 ? '#22c55e' : v < 8.5 ? '#00adc4' : '#374df5'
/** Renkli zemin üstündeki yazı rengi (okunabilirlik için) */
export const scoreTextColor = (v: number) => (v <= 0 ? '#475569' : v <= 3 || v >= 8.5 ? '#ffffff' : '#0f172a')

/** Oyuncu tipine göre hazır değerler (sonra ince ayar yapılır) */
export const ATTR_PRESETS: Record<string, Record<AttrKey, number>> = {
  Golcü: { hucum: 9, teknik: 7, pas: 5, savunma: 3, fizik: 6, hiz: 7 },
  Duvar: { hucum: 3, teknik: 5, pas: 6, savunma: 9, fizik: 7, hiz: 5 },
  Motor: { hucum: 6, teknik: 5, pas: 6, savunma: 6, fizik: 9, hiz: 8 },
  Teknisyen: { hucum: 7, teknik: 9, pas: 8, savunma: 4, fizik: 5, hiz: 6 },
  Kaleci: { hucum: 2, teknik: 5, pas: 5, savunma: 9, fizik: 6, hiz: 4 },
}

/** Tek bir özellik değeri: girilmediyse oyuncunun genel gücü kullanılır. */
export const attrValue = (p: LineupPlayer, k: AttrKey) => {
  const v = p.attrs?.[k] ?? 0
  return v > 0 ? v : powerOf(p)
}

export const hasRatings = (s: LineupState) => s.players.some((p) => p.stars > 0 || attrsOf(p))

/** İki takımın farkı: genel güç farkı ağırlıklı, her özelliğin farkı da hesaba katılır. */
const imbalance = (A: LineupPlayer[], B: LineupPlayer[]) => {
  const sum = (t: LineupPlayer[], f: (p: LineupPlayer) => number) => t.reduce((x, p) => x + f(p), 0)
  let cost = 3 * (sum(A, powerOf) - sum(B, powerOf)) ** 2
  for (const k of ATTR_KEYS) {
    if (k === 'savunma' || k === 'hucum' || k === 'fizik') cost += (sum(A, (p) => attrValue(p, k)) - sum(B, (p) => attrValue(p, k))) ** 2
    else cost += 0.5 * (sum(A, (p) => attrValue(p, k)) - sum(B, (p) => attrValue(p, k))) ** 2
  }
  return cost
}

/** Takım güç özeti (karşılaştırma tablosu için) */
export const teamStrength = (s: LineupState, team: Team) => {
  const byId = new Map(s.players.map((p) => [p.id, p]))
  const ps = team.slots.map((id) => (id ? byId.get(id) : undefined)).filter((p): p is LineupPlayer => !!p)
  const avgOf = (f: (p: LineupPlayer) => number) => (ps.length ? ps.reduce((x, p) => x + f(p), 0) / ps.length : 0)
  return {
    count: ps.length,
    power: avgOf(powerOf),
    attrs: Object.fromEntries(ATTR_KEYS.map((k) => [k, avgOf((p) => attrValue(p, k))])) as Record<AttrKey, number>,
  }
}

/**
 * Oyuncuları iki takıma dağıtır.
 * - Puan (yıldız ya da ayrıntı) girildiyse dengeli: en iyi iki kaleci ayrılır; saha oyuncuları
 *   önce yılan usulü dağıtılır, sonra takımlar arası takaslarla hem genel güç hem de
 *   hücum/savunma/kondisyon gibi özellikler birbirine yaklaştırılır. Her seferinde farklı
 *   ama dengeli bir sonuç için birkaç rastgele başlangıç denenir.
 * - Puan yoksa tamamen rastgele.
 * Fazla oyuncular yedekte kalır (dengeli modda rastgele seçilir). Kaleci ilk slota (kale) yerleşir;
 * ayrıntı girildiyse savunmacılar arkaya, hücumcular öne dizilir.
 */
export const distribute = (s: LineupState, mode: 'auto' | 'random' = 'auto'): { state: LineupState; balanced: boolean } => {
  const n = s.perSide
  const balanced = mode === 'auto' && hasRatings(s)

  const gks = s.players.filter((p) => p.gk)
  const orderedGks = balanced ? [...gks].sort((a, b) => attrValue(b, 'savunma') - attrValue(a, 'savunma') || Math.random() - 0.5) : shuffle(gks)
  const gkA = orderedGks[0] ?? null
  const gkB = orderedGks[1] ?? null
  const capA = n - (gkA ? 1 : 0)
  const capB = n - (gkB ? 1 : 0)
  // Fazla kaleciler saha oyuncusu gibi dağıtılır; sığmayanlar yedekte kalır
  const pool = shuffle([...orderedGks.slice(2), ...s.players.filter((p) => !p.gk)]).slice(0, capA + capB)

  let A: LineupPlayer[] = []
  let B: LineupPlayer[] = []
  if (!balanced) {
    A = pool.slice(0, capA)
    B = pool.slice(capA, capA + capB)
  } else {
    let best: { A: LineupPlayer[]; B: LineupPlayer[]; cost: number } | null = null
    for (let run = 0; run < 24; run++) {
      const sorted = [...pool].sort((a, b) => powerOf(b) - powerOf(a) + (Math.random() - 0.5) * 1.6)
      const a: LineupPlayer[] = []
      const b: LineupPlayer[] = []
      sorted.forEach((p, i) => {
        const prefer = i % 4 === 0 || i % 4 === 3 ? a : b
        const other = prefer === a ? b : a
        const cap = (t: LineupPlayer[]) => (t === a ? capA : capB)
        if (prefer.length < cap(prefer)) prefer.push(p)
        else other.push(p)
      })
      // Kaleci gücü de toplam dengeye dahil
      const withGk = (t: LineupPlayer[], gk: LineupPlayer | null) => (gk ? [gk, ...t] : t)
      let cost = imbalance(withGk(a, gkA), withGk(b, gkB))
      let improved = true
      while (improved) {
        improved = false
        for (let i = 0; i < a.length; i++) {
          for (let j = 0; j < b.length; j++) {
            ;[a[i], b[j]] = [b[j]!, a[i]!]
            const c = imbalance(withGk(a, gkA), withGk(b, gkB))
            if (c < cost - 1e-9) {
              cost = c
              improved = true
            } else {
              ;[a[i], b[j]] = [b[j]!, a[i]!]
            }
          }
        }
      }
      if (!best || cost < best.cost - 1e-9 || (Math.abs(cost - best.cost) < 1e-9 && Math.random() < 0.5)) best = { A: a, B: b, cost }
    }
    A = best!.A
    B = best!.B
  }

  const detailed = s.players.some((p) => attrsOf(p))
  const arrange = (t: LineupPlayer[]) =>
    detailed ? [...t].sort((a, b) => attrValue(b, 'savunma') - attrValue(b, 'hucum') - (attrValue(a, 'savunma') - attrValue(a, 'hucum'))) : t

  const build = (team: Team, gk: LineupPlayer | null, rest: LineupPlayer[]): Team => {
    const slots: (string | null)[] = [...(gk ? [gk.id] : []), ...arrange(rest).map((p) => p.id)].slice(0, n)
    while (slots.length < n) slots.push(null)
    return { ...team, slots, positions: [] }
  }

  return {
    balanced,
    state: { ...s, teamA: build(s.teamA, gkA, A), teamB: build(s.teamB, gkB, B) },
  }
}

/** Kişi sayısı değişince: dizilişi varsayılana çeker, taşan oyuncular yedeğe düşer. */
export const resizeLineup = (s: LineupState, perSide: number): LineupState => {
  const fit = (t: Team): Team => {
    const slots = t.slots.slice(0, perSide)
    while (slots.length < perSide) slots.push(null)
    return { ...t, formation: FORMATIONS[perSide]![0]!, slots, positions: [] }
  }
  return { ...s, perSide, teamA: fit(s.teamA), teamB: fit(s.teamB) }
}

/** Pitch bileşeninin beklediği biçime çevirir. */
export const toMatch = (s: LineupState): Match => ({
  id: 'kadro',
  groupId: '',
  date: '',
  time: '',
  venue: '',
  playersPerSide: s.perSide,
  status: 'planned',
  teamA: s.teamA,
  teamB: s.teamB,
  goals: [],
  votingClosed: false,
  createdAt: '',
})

export const toPlayerMap = (s: LineupState) =>
  new Map<string, Player>(
    s.players.map((p) => [p.id, { id: p.id, name: p.name, position: p.gk ? 'KL' : 'OS', number: 0, foot: 'Sağ', createdAt: '' }]),
  )

// ---- Paylaşım linki: kompakt JSON → base64url ----

type PackedTeam = [name: string, color: string, formation: number[], slots: number[], positions: ([number, number] | 0)[]]
type Packed = { v: 1 | 2; n: number; p: [string, number, 0 | 1, number[]?][]; a: PackedTeam; b: PackedTeam }

const toB64 = (str: string) => {
  const bytes = new TextEncoder().encode(str)
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
const fromB64 = (b64: string) => {
  const bin = atob(b64.replace(/-/g, '+').replace(/_/g, '/'))
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))
}

export const encodeLineup = (s: LineupState): string => {
  const idx = new Map(s.players.map((p, i) => [p.id, i]))
  const packTeam = (t: Team): PackedTeam => [
    t.name,
    t.color,
    t.formation,
    t.slots.map((id) => (id ? idx.get(id) ?? -1 : -1)),
    t.slots.map((_, i) => {
      const pos = t.positions?.[i]
      return pos ? [Math.round(pos.x), Math.round(pos.y)] : 0
    }),
  ]
  const packed: Packed = {
    v: 2,
    n: s.perSide,
    p: s.players.map((p) => {
      const a = attrsOf(p)
      return a ? [p.name, p.stars, p.gk ? 1 : 0, ATTR_KEYS.map((k) => a[k] ?? 0)] : [p.name, p.stars, p.gk ? 1 : 0]
    }),
    a: packTeam(s.teamA),
    b: packTeam(s.teamB),
  }
  return toB64(JSON.stringify(packed))
}

export const decodeLineup = (code: string): LineupState | null => {
  try {
    const d = JSON.parse(fromB64(code)) as Packed
    if ((d.v !== 1 && d.v !== 2) || !FORMATIONS[d.n] || !Array.isArray(d.p)) return null
    const players = d.p.map(([name, stars, gk, attrs]): LineupPlayer => ({
      id: uid(),
      name: String(name).slice(0, 24),
      stars: Number(stars) || 0,
      gk: gk === 1,
      attrs: Array.isArray(attrs) ? Object.fromEntries(ATTR_KEYS.map((k, i) => [k, Math.max(0, Math.min(10, (Number(attrs[i]) || 0) * (d.v === 1 ? 2 : 1)))])) : undefined,
    }))
    const unpackTeam = ([name, color, formation, slots, positions]: PackedTeam): Team => ({
      name: String(name).slice(0, 24),
      color: String(color),
      formation,
      slots: Array.from({ length: d.n }, (_, i) => players[slots[i] ?? -1]?.id ?? null),
      positions: Array.from({ length: d.n }, (_, i) => {
        const p = positions?.[i]
        return Array.isArray(p) ? { x: p[0], y: p[1] } : null
      }),
    })
    return { scale: 10, perSide: d.n, players, teamA: unpackTeam(d.a), teamB: unpackTeam(d.b) }
  } catch {
    return null
  }
}
