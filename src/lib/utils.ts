export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)

export const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

export const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

export const round1 = (n: number) => Math.round(n * 10) / 10

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toLocaleUpperCase('tr'))
    .join('')

export const todayISO = () => {
  const d = new Date()
  return toISODate(d)
}

export const toISODate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const parseDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y!, m! - 1, d!)
}

export const formatDayHeader = (iso: string) => {
  const d = parseDate(iso)
  const today = parseDate(todayISO())
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000)
  const base = d.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })
  if (diff === 0) return `Bugün · ${base}`
  if (diff === 1) return `Yarın · ${base}`
  if (diff === -1) return `Dün · ${base}`
  return base
}

export const formatShortDate = (iso: string) =>
  parseDate(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })

/** Sofascore benzeri rating renk skalası */
export const ratingColor = (r: number) => {
  if (r >= 9) return '#374df5'
  if (r >= 8) return '#00adc4'
  if (r >= 7) return '#00c424'
  if (r >= 6.5) return '#d9af00'
  if (r >= 6) return '#ed7e07'
  return '#dc0c00'
}

/** 0-99 özellik puanı için renk */
export const attrColor = (v: number) => ratingColor(v / 10)

/** Basit deterministik rastgele sayı üreteci (örnek veri için) */
export const seededRandom = (seed: number) => {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}
