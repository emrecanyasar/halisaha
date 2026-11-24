import type { FeeSplit, OpponentLevel } from '../types'

export const LEVEL_LABELS: Record<OpponentLevel, string> = {
  amator: 'Amatör',
  orta: 'Orta',
  iyi: 'İyi',
}

export const LEVEL_STYLES: Record<OpponentLevel, string> = {
  amator: 'bg-sky-50 text-sky-700',
  orta: 'bg-amber-50 text-amber-700',
  iyi: 'bg-rose-50 text-rose-700',
}

export const FEE_LABELS: Record<FeeSplit, string> = {
  yari: 'Saha ücreti yarı yarıya',
  kaybeden: 'Saha ücretini kaybeden öder',
  biz: 'Saha ücreti bizden',
}

/** Sadece rakamlar */
const digits = (s: string) => s.replace(/\D/g, '')

/** Türkiye cep telefonu mu? (05xx xxx xx xx, 5xx..., +90 5xx...) */
export const isValidPhone = (s: string) => {
  const d = digits(s)
  return /^(90)?0?5\d{9}$/.test(d)
}

/** Uluslararası biçim (WhatsApp için): 905xxxxxxxxx */
export const intlPhone = (s: string) => {
  const d = digits(s)
  const local = d.replace(/^90/, '').replace(/^0/, '')
  return `90${local}`
}

/** Okunaklı biçim: 0532 123 45 67 */
export const formatPhone = (s: string) => {
  const local = intlPhone(s).slice(2)
  if (local.length !== 10) return s
  return `0${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6, 8)} ${local.slice(8)}`
}
