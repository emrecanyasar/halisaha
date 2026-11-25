import type { ServerAggregates } from './lib/server'

export type Position = 'KL' | 'SAV' | 'OS' | 'ATK'
export type Foot = 'Sağ' | 'Sol' | 'İki'
export type ShirtSize = 'S' | 'M' | 'L' | 'XL' | 'XXL'
export const SHIRT_SIZES: ShirtSize[] = ['S', 'M', 'L', 'XL', 'XXL']

/** Sıra önemli: kadro linkleri bu sırayla saklanır, yeni özellik sona eklenir */
export const ATTR_KEYS = ['hucum', 'teknik', 'pas', 'savunma', 'fizik', 'hiz'] as const
export type AttrKey = (typeof ATTR_KEYS)[number]
export type Attributes = Record<AttrKey, number>

export interface Player {
  id: string
  name: string
  position: Position
  /** İsteğe bağlı yan mevki */
  position2?: Position
  /**
   * Ana rating sisteminden önce maç oyu almış oyuncular: ilk değerlendirme yerine
   * başlangıç kartı ilk maçlarının oylarından çıkarılır.
   */
  legacyRating?: boolean
  number: number
  foot: Foot
  /** Forma bedeni */
  size?: ShirtSize
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
  /**
   * Elle sürüklenmiş konumlar (saha yüzdesi, 0-100). Slotla aynı sırada.
   * null/undefined = dizilişteki varsayılan yer.
   */
  positions?: (PitchPos | null)[]
}

export interface PitchPos {
  x: number
  y: number
}

export interface Goal {
  id: string
  team: TeamSide
  scorerId: string | null // null = kendi kalesine / bilinmiyor
  assistId: string | null
}

export type MatchStatus = 'planned' | 'finished'

export type Attendance = 'yes' | 'no'

export interface Match {
  id: string
  /** Maçın ait olduğu grup */
  groupId: string
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
  /** Yaklaşan maça katılım: oyuncu kimliği → geliyorum / gelmiyorum */
  attendance?: Record<string, Attendance>
  createdAt: string
}

export interface Vote {
  id: string
  matchId: string
  voterId: string
  targetId: string
  /** Her biri 1 - 10. Maç puanı bu beşinin ortalamasıdır (genel puan ayrıca verilmez). */
  attrs: Attributes
  createdAt: string
}

/**
 * İlk değerlendirme (ana rating): grup arkadaşı yeni üyenin 5 özelliğini gizlice puanlar.
 * attrs null = "Tanımıyorum" (geçildi).
 */
export interface BaseVote {
  id: string
  voterId: string
  targetId: string
  attrs: Attributes | null
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

/** Halı saha maç grubu. Bir oyuncu birden çok grupta olabilir. */
export interface Group {
  id: string
  name: string
  /** Davet kodu: bu kodla (ya da /katil/<kod> linkiyle) gruba katılınır */
  inviteCode: string
  adminIds: string[]
  memberIds: string[]
  /** Açık grupların maçları ana sayfada herkese görünür */
  isPublic: boolean
  /** Örnek (demo) grup: her açılışta yeniden üretilir, katılınamaz */
  demo?: boolean
  createdAt: string
}

export type OpponentLevel = 'amator' | 'orta' | 'iyi'
/** Saha ücreti nasıl ödenecek */
export type FeeSplit = 'yari' | 'kaybeden' | 'biz'

/** Rakip arayan takımın ilanı. İletişim site dışında (telefon / WhatsApp) kurulur. */
export interface OpponentAd {
  id: string
  /** İlanı veren kullanıcı */
  ownerId: string
  /** İsteğe bağlı: ilanın ait olduğu grup */
  groupId?: string
  teamName: string
  date: string // YYYY-MM-DD
  time: string // HH:mm
  venue: string
  playersPerSide: number
  level: OpponentLevel
  feeSplit: FeeSplit
  /** Sadece giriş yapanlara gösterilir */
  phone: string
  note?: string
  /** Rakip bulununca ilan kapatılır */
  status: 'open' | 'closed'
  createdAt: string
}

export interface AppData {
  version: 10
  groups: Group[]
  opponentAds: OpponentAd[]
  accounts: Account[]
  players: Player[]
  matches: Match[]
  votes: Vote[]
  baseVotes: BaseVote[]
  /** Veritabanı modunda sunucudan gelen toplu değerler (oylar tarayıcıya gelmez) */
  server?: ServerAggregates
  /** Oturum açmış kullanıcının oyuncu kimliği (null = çıkış yapılmış) */
  currentUserId: string | null
}
