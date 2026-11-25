import { ATTR_KEYS, type AttrKey, type Position } from '../types'

export interface AttrLabel {
  short: string
  long: string
  /** Oylamada adın yanında görünen kısa açıklama */
  hint: string
}

/** Saha oyuncularının 5 özelliği */
export const ATTR_LABELS: Record<AttrKey, AttrLabel> = {
  hucum: { short: 'ŞUT', long: 'Hücum / Şut', hint: 'Şut, bitiricilik, gol yollarında etki' },
  teknik: { short: 'TEK', long: 'Teknik', hint: 'Top kontrolü, dripling' },
  pas: { short: 'PAS', long: 'Pas / Oyun kurma', hint: 'Pas isabeti, oyun kurma' },
  savunma: { short: 'SAV', long: 'Savunma / İkili mücadele', hint: 'İkili mücadele, top kapma, yer tutma' },
  fizik: { short: 'FİZ', long: 'Fizik / Kondisyon', hint: 'Kondisyon, güç, dayanıklılık' },
  hiz: { short: 'HIZ', long: 'Hız', hint: 'Çabukluk, sprint, ilk adım' },
}

/**
 * Kalecinin 5 özelliği (FIFA kartlarındaki gibi). Veride aynı 5 alanda tutulur,
 * sadece anlamları farklıdır.
 */
export const GK_ATTR_LABELS: Record<AttrKey, AttrLabel> = {
  hucum: { short: 'REF', long: 'Refleks', hint: 'Yakın mesafe şutlara tepki' },
  teknik: { short: 'ELL', long: 'Elle kontrol', hint: 'Topu tutma, sektirmeme' },
  pas: { short: 'VUR', long: 'Vuruş / Oyun başlatma', hint: 'Degaj, ayakla ve elle pas' },
  savunma: { short: 'POZ', long: 'Pozisyon alma', hint: 'Kalede yer tutma, açı kapatma' },
  fizik: { short: 'UÇM', long: 'Uçma / Çıkış', hint: 'Plonjon, birebirde çıkış' },
  // Kalecide hız sorulmaz ve kartta görünmez (ağırlığı 0)
  hiz: { short: 'HIZ', long: 'Hız', hint: 'Çabukluk' },
}

/** Mevkide oylanan ve kartta görünen özellikler: kalecide 5, saha oyuncularında 6 (hız dahil) */
export const attrKeysFor = (position?: Position): readonly AttrKey[] => (position === 'KL' ? ATTR_KEYS.filter((k) => k !== 'hiz') : ATTR_KEYS)

export const attrLabels = (position?: Position) => (position === 'KL' ? GK_ATTR_LABELS : ATTR_LABELS)

/**
 * Genel puanda (ve maç puanında) özelliklerin mevkiye göre ağırlığı; her satırın toplamı 1.
 * Örn. forvetin savunması genel puanı az etkiler, şutu çok etkiler.
 */
export const ATTR_WEIGHTS: Record<Position, Record<AttrKey, number>> = {
  ATK: { hucum: 0.4, teknik: 0.2, pas: 0.1, savunma: 0.05, fizik: 0.15, hiz: 0.1 },
  OS: { hucum: 0.1, teknik: 0.2, pas: 0.3, savunma: 0.15, fizik: 0.15, hiz: 0.1 },
  SAV: { hucum: 0.05, teknik: 0.1, pas: 0.15, savunma: 0.4, fizik: 0.2, hiz: 0.1 },
  KL: { hucum: 0.25, teknik: 0.2, pas: 0.1, savunma: 0.25, fizik: 0.2, hiz: 0 },
}

/** Mevki için en önemli iki özellik (oylamada "önemli" etiketi) */
export const keyAttrs = (position: Position): AttrKey[] =>
  (Object.entries(ATTR_WEIGHTS[position]) as [AttrKey, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([k]) => k)

export const POSITION_LABELS: Record<Position, string> = {
  KL: 'Kaleci',
  SAV: 'Savunma',
  OS: 'Orta saha',
  ATK: 'Atak',
}

export const POSITIONS: Position[] = ['KL', 'SAV', 'OS', 'ATK']

/** "Orta saha · yan: Atak" */
export const positionText = (p: { position: Position; position2?: Position }) =>
  POSITION_LABELS[p.position] + (p.position2 && p.position2 !== p.position ? ` · yan: ${POSITION_LABELS[p.position2]}` : '')

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
