import type { Match, PitchPos, Team, TeamSide } from '../types'

/** Formasyondaki her slotun saha üzerindeki varsayılan konumu (yüzde). A alt yarı, B üst yarı. */
export const formationLayout = (formation: number[], side: TeamSide) => {
  const pos: PitchPos[] = []
  const rows = formation.length
  formation.forEach((count, row) => {
    const t = rows === 1 ? 0 : row / (rows - 1)
    const yFromGoal = 7.5 + t * 35
    const y = side === 'A' ? 100 - yFromGoal : yFromGoal
    for (let i = 0; i < count; i++) pos.push({ x: ((i + 1) / (count + 1)) * 100, y })
  })
  return pos
}

/** Slotun gerçek konumu: elle taşındıysa o, değilse dizilişteki yeri */
export const slotPos = (team: Team, side: TeamSide, i: number): PitchPos =>
  team.positions?.[i] ?? formationLayout(team.formation, side)[i] ?? { x: 50, y: side === 'A' ? 75 : 25 }

/** Konum hangi takımın yarı sahasında? (A alt, B üst) */
export const sideAt = (pos: PitchPos): TeamSide => (pos.y >= 50 ? 'A' : 'B')

const dist = (a: PitchPos, b: PitchPos) => Math.hypot(a.x - b.x, (a.y - b.y) * 1.55) // saha uzun olduğu için y ölçeklenir

const teamKey = (side: TeamSide) => (side === 'A' ? 'teamA' : 'teamB') as 'teamA' | 'teamB'

const cloneTeam = (t: Team): Team => {
  const positions = [...(t.positions ?? [])]
  while (positions.length < t.slots.length) positions.push(null)
  return { ...t, slots: [...t.slots], positions }
}

/** Bir yarıdaki en yakın slot (dolu ya da boş) */
const nearestSlot = (team: Team, side: TeamSide, pos: PitchPos, filter: (pid: string | null) => boolean) => {
  let best = -1
  let bestD = Infinity
  team.slots.forEach((pid, i) => {
    if (!filter(pid)) return
    const d = dist(slotPos(team, side, i), pos)
    if (d < bestD) {
      bestD = d
      best = i
    }
  })
  return { index: best, d: bestD }
}

/**
 * Sahadaki bir oyuncuyu sürükleyip bırakınca:
 * - Kendi yarısında kalırsa sadece konumu değişir.
 * - Orta sahayı geçerse diğer takıma geçer: karşı takımda boş yer varsa oraya,
 *   yoksa bırakıldığı yere en yakın rakip oyuncuyla yer değiştirir.
 */
export const moveOnPitch = (m: Match, side: TeamSide, index: number, pos: PitchPos): Match => {
  const fromKey = teamKey(side)
  const from = cloneTeam(m[fromKey])
  const pid = from.slots[index]
  const target = sideAt(pos)
  if (!pid || target === side) {
    from.positions![index] = pos
    return { ...m, [fromKey]: from }
  }
  const toKey = teamKey(target)
  const to = cloneTeam(m[toKey])
  const empty = nearestSlot(to, target, pos, (p) => p === null)
  if (empty.index !== -1) {
    to.slots[empty.index] = pid
    to.positions![empty.index] = pos
    from.slots[index] = null
    from.positions![index] = null
  } else {
    const swap = nearestSlot(to, target, pos, (p) => p !== null)
    const other = to.slots[swap.index]!
    to.slots[swap.index] = pid
    to.positions![swap.index] = pos
    from.slots[index] = other // yer değiştiren oyuncu, gidenin yerine geçer
  }
  return { ...m, [fromKey]: from, [toKey]: to }
}

/**
 * Kadrodaki (sahada olmayan) bir oyuncuyu sahaya bırakınca:
 * - Bir oyuncunun/boş yerin üstüne bırakılırsa o yere geçer (oradaki oyuncu yedeğe döner).
 * - Boş bir alana bırakılırsa o yarıdaki ilk boş yere, bırakıldığı konumda yerleşir.
 * - O yarı doluysa en yakın oyuncunun yerini alır.
 */
export const dropOnPitch = (m: Match, playerId: string, pos: PitchPos): Match => {
  const side = sideAt(pos)
  const key = teamKey(side)
  const team = cloneTeam(m[key])
  const near = nearestSlot(team, side, pos, () => true)
  if (near.index !== -1 && near.d < 9) {
    team.slots[near.index] = playerId
    return { ...m, [key]: team }
  }
  const empty = nearestSlot(team, side, pos, (p) => p === null)
  const i = empty.index !== -1 ? empty.index : near.index
  if (i === -1) return m
  team.slots[i] = playerId
  team.positions![i] = pos
  return { ...m, [key]: team }
}
