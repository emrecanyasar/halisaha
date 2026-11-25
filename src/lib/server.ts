import type { Attributes } from '../types'

/**
 * Sunucudan gelen toplu değerler. Veritabanı modunda oyların kendisi tarayıcıya hiç gelmez
 * (herkes sadece kendi oyunu görür); ratingler, oylama durumu ve kart girdileri buradan okunur.
 */
export interface ServerAggregates {
  /** Bitmiş maçların oylama durumu */
  matchStats: Record<string, { total: number; done: number; iVoted: boolean; revealed: boolean }>
  /** Sonuçları açılmış maçlarda oyuncu başına rating */
  ratings: Record<string, { playerId: string; rating: number; votes: number }[]>
  /** Oyuncu başına, sonuçları açılmış maçlardaki özellik ortalamaları (1-10) */
  averages: Record<string, { matchId: string; date: string; time: string; votes: number; attrs: Attributes }[]>
  /** Oyuncu başına ilk değerlendirme özeti; attrs sadece yeterli değerlendirme varsa dolu */
  base: Record<string, { count: number; required: number; attrs: Attributes | null }>
}

let current: ServerAggregates | null = null

/** StoreProvider her çizimde günceller; istatistik fonksiyonları buradan okur. */
export const setServerAggregates = (s: ServerAggregates | null) => {
  current = s
}
export const serverAggregates = () => current
