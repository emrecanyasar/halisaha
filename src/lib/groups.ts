import type { AppData, Group, Match } from '../types'

/** Karışması zor 6 haneli davet kodu (0/O, 1/I gibi benzer karakterler yok) */
export const newInviteCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

export const normalizeCode = (code: string) => code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')

export const isMember = (g: Group | undefined, playerId: string | null | undefined) => !!g && !!playerId && g.memberIds.includes(playerId)
export const isAdmin = (g: Group | undefined, playerId: string | null | undefined) => !!g && !!playerId && g.adminIds.includes(playerId)

export const groupById = (d: AppData, id: string | undefined) => d.groups.find((g) => g.id === id)
export const groupOf = (d: AppData, m: Match) => groupById(d, m.groupId)

/** Oturum açmış kullanıcının üye olduğu gruplar */
export const myGroups = (d: AppData) => (d.currentUserId ? d.groups.filter((g) => g.memberIds.includes(d.currentUserId!)) : [])

/** Kullanıcının yönettiği gruplar (maç oluşturabildikleri) */
export const adminGroups = (d: AppData) => (d.currentUserId ? d.groups.filter((g) => g.adminIds.includes(d.currentUserId!)) : [])

/** Maçları görülebilen gruplar: herkese açık olanlar + üye olunanlar */
export const visibleGroups = (d: AppData) => d.groups.filter((g) => g.isPublic || isMember(g, d.currentUserId))

/** Örnek gruplara ait (gerçek kişi olmayan) oyuncular */
export const isDemoPlayer = (id: string) => id.startsWith('demo-')

/** Bir grubun üyeleri (oyuncu nesneleri), isme göre sıralı */
export const membersOf = (d: AppData, g: Group | undefined) =>
  g ? d.players.filter((p) => g.memberIds.includes(p.id)).sort((a, b) => a.name.localeCompare(b.name, 'tr')) : []

/**
 * Oyuncu profilini kim düzenleyebilir?
 * - Hesabı olan oyuncuyu sadece kendisi.
 * - Hesabı olmayan (yönetici tarafından eklenmiş) oyuncuyu, üyesi olduğu grubun yöneticisi.
 */
export const canEditPlayer = (d: AppData, playerId: string) => {
  const me = d.currentUserId
  if (!me || isDemoPlayer(playerId)) return false
  if (me === playerId) return true
  if (d.accounts.some((a) => a.playerId === playerId)) return false
  return d.groups.some((g) => g.memberIds.includes(playerId) && g.adminIds.includes(me))
}
