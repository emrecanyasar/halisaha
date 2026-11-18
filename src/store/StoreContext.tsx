import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Account, AppData, Attributes, Foot, Goal, Match, Player, Position, TeamSide, Vote } from '../types'
import { FORMATIONS } from '../lib/constants'
import { createSeedData, emptyData } from '../lib/seed'
import { uid } from '../lib/utils'
import { hashPassword, normalizeEmail } from '../lib/auth'

/**
 * Veri katmanı. Deneme sürümünde her şey tarayıcının localStorage'ında tutulur.
 * İleride Supabase/Firebase gibi bir backend'e geçerken sadece bu dosyadaki
 * load/save ve aksiyonlar değişecek; sayfalar aynı kalacak.
 */
const STORAGE_KEY = 'halisaha:v1'

/** Eski kayıtları güncel sürüme taşır. */
export const migrate = (raw: unknown): AppData | null => {
  const d = raw as Omit<Partial<AppData>, 'version'> & { version?: number }
  if (!d || !Array.isArray(d.players)) return null
  if (d.version === 1) return { ...(d as unknown as AppData), version: 2, accounts: [], currentUserId: null }
  if (d.version === 2) return d as unknown as AppData
  return null
}

const load = (): AppData => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = migrate(JSON.parse(raw))
      if (parsed) return parsed
    }
  } catch {
    /* depolama kullanılamıyor olabilir */
  }
  return createSeedData()
}

const save = (data: AppData) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    /* yoksay */
  }
}

export type NewMatchInput = Pick<Match, 'date' | 'time' | 'venue' | 'playersPerSide'> & {
  teamAName: string
  teamAColor: string
  teamBName: string
  teamBColor: string
}

const resizeSlots = (slots: (string | null)[], n: number) => {
  const s = slots.slice(0, n)
  while (s.length < n) s.push(null)
  return s
}

export type AuthResult = { ok: true } | { ok: false; error: string }

export interface RegisterInput {
  name: string
  email: string
  password: string
  /** Ekipte zaten var olan, hesabı olmayan bir oyuncu profilini sahiplenmek için */
  claimPlayerId: string | null
  position: Position
  number: number
  foot: Foot
}

const createActions = (set: (fn: (d: AppData) => AppData) => void, get: () => AppData) => ({
  // ---- Oturum (deneme sürümü: her şey bu cihazda) ----
  login: async (email: string, password: string): Promise<AuthResult> => {
    const e = normalizeEmail(email)
    const acc = get().accounts.find((a) => a.email === e)
    if (!acc || acc.passwordHash !== (await hashPassword(e, password))) return { ok: false, error: 'E-posta ya da şifre hatalı.' }
    set((d) => ({ ...d, currentUserId: acc.playerId }))
    return { ok: true }
  },
  register: async (input: RegisterInput): Promise<AuthResult> => {
    const e = normalizeEmail(input.email)
    const d0 = get()
    if (d0.accounts.some((a) => a.email === e)) return { ok: false, error: 'Bu e-posta ile zaten bir hesap var.' }
    if (input.claimPlayerId && d0.accounts.some((a) => a.playerId === input.claimPlayerId))
      return { ok: false, error: 'Bu oyuncu profili başka bir hesaba bağlı.' }
    const passwordHash = await hashPassword(e, input.password)
    const now = new Date().toISOString()
    const playerId = input.claimPlayerId ?? uid()
    const account: Account = { id: uid(), email: e, passwordHash, playerId, createdAt: now }
    set((d) => ({
      ...d,
      accounts: [...d.accounts, account],
      players: input.claimPlayerId
        ? d.players.map((p) => (p.id === playerId ? { ...p, name: input.name.trim() || p.name } : p))
        : [...d.players, { id: playerId, name: input.name.trim(), position: input.position, number: input.number, foot: input.foot, createdAt: now }],
      currentUserId: playerId,
    }))
    return { ok: true }
  },
  logout: () => set((d) => ({ ...d, currentUserId: null })),
  updateEmail: (playerId: string, email: string): AuthResult => {
    const e = normalizeEmail(email)
    const d0 = get()
    if (d0.accounts.some((a) => a.email === e && a.playerId !== playerId)) return { ok: false, error: 'Bu e-posta başka bir hesapta kullanılıyor.' }
    set((d) => ({ ...d, accounts: d.accounts.map((a) => (a.playerId === playerId ? { ...a, email: e } : a)) }))
    return { ok: true }
  },
  changePassword: async (playerId: string, current: string, next: string): Promise<AuthResult> => {
    const acc = get().accounts.find((a) => a.playerId === playerId)
    if (!acc) return { ok: false, error: 'Hesap bulunamadı.' }
    if (acc.passwordHash !== (await hashPassword(acc.email, current))) return { ok: false, error: 'Mevcut şifre hatalı.' }
    const passwordHash = await hashPassword(acc.email, next)
    set((d) => ({ ...d, accounts: d.accounts.map((a) => (a.id === acc.id ? { ...a, passwordHash } : a)) }))
    return { ok: true }
  },

  setCurrentUser: (id: string | null) => set((d) => ({ ...d, currentUserId: id })),

  addPlayer: (p: Omit<Player, 'id' | 'createdAt'>) => {
    const player: Player = { ...p, id: uid(), createdAt: new Date().toISOString() }
    set((d) => ({ ...d, players: [...d.players, player] }))
    return player
  },
  updatePlayer: (id: string, patch: Partial<Player>) =>
    set((d) => ({ ...d, players: d.players.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
  deletePlayer: (id: string) =>
    set((d) => ({
      ...d,
      players: d.players.filter((p) => p.id !== id),
      matches: d.matches.map((m) => ({
        ...m,
        teamA: { ...m.teamA, slots: m.teamA.slots.map((s) => (s === id ? null : s)) },
        teamB: { ...m.teamB, slots: m.teamB.slots.map((s) => (s === id ? null : s)) },
      })),
      votes: d.votes.filter((v) => v.voterId !== id && v.targetId !== id),
      accounts: d.accounts.filter((a) => a.playerId !== id),
      currentUserId: d.currentUserId === id ? null : d.currentUserId,
    })),

  createMatch: (input: NewMatchInput) => {
    const formation = FORMATIONS[input.playersPerSide]![0]!
    const empty = Array<string | null>(input.playersPerSide).fill(null)
    const match: Match = {
      id: uid(),
      date: input.date,
      time: input.time,
      venue: input.venue,
      playersPerSide: input.playersPerSide,
      status: 'planned',
      teamA: { name: input.teamAName, color: input.teamAColor, formation, slots: [...empty] },
      teamB: { name: input.teamBName, color: input.teamBColor, formation, slots: [...empty] },
      goals: [],
      votingClosed: false,
      createdAt: new Date().toISOString(),
    }
    set((d) => ({ ...d, matches: [...d.matches, match] }))
    return match
  },
  updateMatch: (id: string, patch: Partial<Match>) =>
    set((d) => ({ ...d, matches: d.matches.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),
  deleteMatch: (id: string) =>
    set((d) => ({ ...d, matches: d.matches.filter((m) => m.id !== id), votes: d.votes.filter((v) => v.matchId !== id) })),

  setPlayersPerSide: (id: string, n: number) =>
    set((d) => ({
      ...d,
      matches: d.matches.map((m) => {
        if (m.id !== id) return m
        const formation = FORMATIONS[n]![0]!
        return {
          ...m,
          playersPerSide: n,
          teamA: { ...m.teamA, formation, slots: resizeSlots(m.teamA.slots, n) },
          teamB: { ...m.teamB, formation, slots: resizeSlots(m.teamB.slots, n) },
        }
      }),
    })),
  setFormation: (id: string, side: TeamSide, formation: number[]) =>
    set((d) => ({
      ...d,
      matches: d.matches.map((m) => {
        if (m.id !== id) return m
        const key = side === 'A' ? 'teamA' : 'teamB'
        return { ...m, [key]: { ...m[key], formation } }
      }),
    })),
  /** Bir slota oyuncu koyar. Oyuncu başka bir slottaysa yer değiştirirler. */
  assignSlot: (id: string, side: TeamSide, index: number, playerId: string | null) =>
    set((d) => ({
      ...d,
      matches: d.matches.map((m) => {
        if (m.id !== id) return m
        const a = [...m.teamA.slots]
        const b = [...m.teamB.slots]
        const target = side === 'A' ? a : b
        const previous = target[index] ?? null
        if (playerId) {
          for (const arr of [a, b]) {
            const i = arr.indexOf(playerId)
            if (i !== -1) arr[i] = previous
          }
        }
        target[index] = playerId
        return { ...m, teamA: { ...m.teamA, slots: a }, teamB: { ...m.teamB, slots: b } }
      }),
    })),
  setLineups: (id: string, a: (string | null)[], b: (string | null)[]) =>
    set((d) => ({
      ...d,
      matches: d.matches.map((m) =>
        m.id === id ? { ...m, teamA: { ...m.teamA, slots: a }, teamB: { ...m.teamB, slots: b } } : m,
      ),
    })),

  setGoals: (id: string, goals: Goal[]) =>
    set((d) => ({ ...d, matches: d.matches.map((m) => (m.id === id ? { ...m, goals } : m)) })),
  finishMatch: (id: string, goals: Goal[]) =>
    set((d) => ({
      ...d,
      matches: d.matches.map((m) => (m.id === id ? { ...m, goals, status: 'finished', votingClosed: false } : m)),
    })),
  reopenMatch: (id: string) =>
    set((d) => ({
      ...d,
      matches: d.matches.map((m) => (m.id === id ? { ...m, status: 'planned', votingClosed: false } : m)),
      votes: d.votes.filter((v) => v.matchId !== id),
    })),
  setVotingClosed: (id: string, closed: boolean) =>
    set((d) => ({ ...d, matches: d.matches.map((m) => (m.id === id ? { ...m, votingClosed: closed } : m)) })),

  /** Bir oy verenin bu maçtaki tüm oylarını kaydeder (öncekilerin yerine geçer). */
  submitVotes: (matchId: string, voterId: string, entries: { targetId: string; rating: number; attrs: Attributes }[]) =>
    set((d) => {
      const now = new Date().toISOString()
      const kept = d.votes.filter((v) => !(v.matchId === matchId && v.voterId === voterId))
      const fresh: Vote[] = entries.map((e) => ({ id: uid(), matchId, voterId, createdAt: now, ...e }))
      return { ...d, votes: [...kept, ...fresh] }
    }),

  replaceAll: (data: AppData) => set(() => data),
  loadSeed: () => set(() => createSeedData()),
  clearAll: () => set(() => emptyData()),
})

type Actions = ReturnType<typeof createActions>
interface Store extends Actions {
  data: AppData
}

const Ctx = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(load)
  const ref = useRef(data)
  ref.current = data
  useEffect(() => {
    save(data)
  }, [data])
  const set = useCallback((fn: (d: AppData) => AppData) => setData(fn), [])
  const actions = useMemo(() => createActions(set, () => ref.current), [set])
  const value = useMemo(() => ({ data, ...actions }), [data, actions])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useStore = () => {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore StoreProvider içinde kullanılmalı')
  return s
}

export const usePlayerMap = () => {
  const { data } = useStore()
  return useMemo(() => new Map(data.players.map((p) => [p.id, p])), [data.players])
}
