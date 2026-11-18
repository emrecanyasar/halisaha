/** Deneme sürümü için basit şifre özeti. Backend gelince sunucu tarafı kimlik doğrulamaya geçilecek. */
export const normalizeEmail = (e: string) => e.trim().toLowerCase()

export const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim())

export async function hashPassword(email: string, password: string) {
  const text = `halisaha:${normalizeEmail(email)}:${password}`
  if (globalThis.crypto?.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
  }
  // crypto.subtle olmayan ortamlar için yedek (güvenli değil, sadece deneme)
  let h = 0
  for (let i = 0; i < text.length; i++) h = (Math.imul(31, h) + text.charCodeAt(i)) | 0
  return `fb-${h >>> 0}`
}

/** 0-4 arası şifre gücü */
export const passwordStrength = (p: string) => {
  let s = 0
  if (p.length >= 6) s++
  if (p.length >= 10) s++
  if (/[A-ZĞÜŞİÖÇ]/.test(p) && /[a-zğüşıöç]/.test(p)) s++
  if (/\d/.test(p) && /[^A-Za-z0-9ğüşıöçĞÜŞİÖÇ]/.test(p)) s++
  return s
}
