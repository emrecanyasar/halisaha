import type { AttrKey, Position } from '../types'

export const ATTR_LABELS: Record<AttrKey, { short: string; long: string }> = {
  hucum: { short: 'HÜC', long: 'Hücum' },
  teknik: { short: 'TEK', long: 'Teknik' },
  pas: { short: 'PAS', long: 'Pas / Oyun kurma' },
  savunma: { short: 'SAV', long: 'Savunma' },
  fizik: { short: 'FİZ', long: 'Fizik / Kondisyon' },
}

export const POSITION_LABELS: Record<Position, string> = {
  KL: 'Kaleci',
  DEF: 'Defans',
  OS: 'Orta saha',
  FV: 'Forvet',
}

/** Her kişi sayısı için seçilebilir dizilişler (kaleci dahil). İlki varsayılan. */
export const FORMATIONS: Record<number, number[][]> = {
  5: [[1, 2, 2], [1, 2, 1, 1], [1, 1, 2, 1]],
  6: [[1, 2, 2, 1], [1, 3, 2], [1, 2, 3]],
  7: [[1, 3, 2, 1], [1, 2, 3, 1], [1, 3, 3]],
  8: [[1, 3, 3, 1], [1, 3, 2, 2], [1, 4, 2, 1]],
  9: [[1, 3, 3, 2], [1, 4, 3, 1], [1, 3, 4, 1]],
  10: [[1, 4, 3, 2], [1, 3, 4, 2], [1, 4, 4, 1]],
  11: [[1, 4, 4, 2], [1, 4, 3, 3], [1, 3, 5, 2]],
}

export const PLAYERS_PER_SIDE_OPTIONS = [5, 6, 7, 8, 9, 10, 11]

export const TEAM_COLORS = ['#e11d48', '#2563eb', '#16a34a', '#f59e0b', '#7c3aed', '#0891b2', '#f8fafc', '#111827']

export const formationLabel = (f: number[]) => f.slice(1).join('-')
