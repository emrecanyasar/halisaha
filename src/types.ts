export type Position = 'KL' | 'DEF' | 'OS' | 'FV'
export type Foot = 'Sağ' | 'Sol' | 'İki'

export const ATTR_KEYS = ['hucum', 'teknik', 'pas', 'savunma', 'fizik'] as const
export type AttrKey = (typeof ATTR_KEYS)[number]
export type Attributes = Record<AttrKey, number>

export interface Player {
  id: string
  name: string
  position: Position
  number: number
  foot: Foot
  createdAt: string
}

export type TeamSide = 'A' | 'B'

export interface Team {
  name: string
  color: string
  /** Dizilişin satırlarındaki oyuncu sayıları, kaleciden ileriye. Örn: [1,2,3,1] */
  formation: number[]
  /** Dizilişe göre düzleştirilmiş slotlar. null = boş */
  slots: (string | null)[]
}

export interface Goal {
  id: string
  team: TeamSide
  scorerId: string | null // null = kendi kalesine / bilinmiyor
  assistId: string | null
}

export type MatchStatus = 'planned' | 'finished'

export interface Match {
  id: string
  date: string // YYYY-MM-DD
  time: string // HH:mm
  venue: string
  playersPerSide: number
  status: MatchStatus
  teamA: Team
  teamB: Team
  goals: Goal[]
  /** Oylama elle kapatıldı mı? Kapandıysa ya da herkes oy verdiyse sonuçlar açılır. */
  votingClosed: boolean
  createdAt: string
}

export interface Vote {
  id: string
  matchId: string
  voterId: string
  targetId: string
  rating: number // 1 - 10, 0.5 adımlarla
  attrs: Attributes // her biri 1 - 10
  createdAt: string
}

/**
 * Deneme sürümü hesabı. Şifre tarayıcıda SHA-256 ile özetlenip saklanır.
 * Bu GERÇEK bir güvenlik değildir; backend'e (ör. Supabase Auth) geçince kalkacak.
 */
export interface Account {
  id: string
  email: string
  passwordHash: string
  playerId: string
  createdAt: string
}

export interface AppData {
  version: 2
  accounts: Account[]
  players: Player[]
  matches: Match[]
  votes: Vote[]
  /** Oturum açmış kullanıcının oyuncu kimliği (null = çıkış yapılmış) */
  currentUserId: string | null
}
