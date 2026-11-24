import type { LineupState } from './lineup'
import { slotPos } from './pitch'
import type { Team, TeamSide } from '../types'

/**
 * Kadroyu PNG olarak çizer (harici kütüphane yok, düz canvas).
 * Saha 68x105 oranında; üstte başlık, altta site adı.
 */
const W = 680
const H = 1050
const PAD = 40
const HEADER = 90
const FOOTER = 50

const textColorOn = (hex: string) => {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.replace(/./g, (c) => c + c) : h, 16)
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
  return lum > 0.6 ? '#111827' : '#ffffff'
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toLocaleUpperCase('tr'))
    .join('')

const fitText = (ctx: CanvasRenderingContext2D, text: string, max: number) => {
  if (ctx.measureText(text).width <= max) return text
  let t = text
  while (t.length > 1 && ctx.measureText(t + '…').width > max) t = t.slice(0, -1)
  return t + '…'
}

export const renderLineupPng = async (s: LineupState): Promise<Blob> => {
  const canvas = document.createElement('canvas')
  canvas.width = W + PAD * 2
  canvas.height = H + PAD * 2 + HEADER + FOOTER
  const ctx = canvas.getContext('2d')!
  const font = (w: number, px: number) => `${w} ${px}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`

  // Arka plan
  ctx.fillStyle = '#0f172a'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Başlık: Takım A – Takım B
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = font(800, 34)
  ctx.fillStyle = '#ffffff'
  ctx.fillText(fitText(ctx, `${s.teamB.name}  vs  ${s.teamA.name}`, W), canvas.width / 2, PAD + 30)
  ctx.font = font(500, 18)
  ctx.fillStyle = '#94a3b8'
  ctx.fillText(`${s.perSide} vs ${s.perSide}`, canvas.width / 2, PAD + 66)

  // Saha
  const ox = PAD
  const oy = PAD + HEADER
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(ox, oy, W, H, 24)
  ctx.clip()
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#15803d' : '#166534'
    ctx.fillRect(ox, oy + (H / 10) * i, W, H / 10 + 1)
  }
  // Çizgiler (68x105 birim → piksel)
  const k = W / 68
  ctx.strokeStyle = 'rgba(255,255,255,.6)'
  ctx.lineWidth = 3
  const rect = (x: number, y: number, w: number, h: number) => ctx.strokeRect(ox + x * k, oy + y * k, w * k, h * k)
  rect(2, 2, 64, 101)
  ctx.beginPath()
  ctx.moveTo(ox + 2 * k, oy + 52.5 * k)
  ctx.lineTo(ox + 66 * k, oy + 52.5 * k)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(ox + 34 * k, oy + 52.5 * k, 9.15 * k, 0, Math.PI * 2)
  ctx.stroke()
  rect(13.85, 2, 40.3, 16.5)
  rect(24.85, 2, 18.3, 5.5)
  rect(13.85, 86.5, 40.3, 16.5)
  rect(24.85, 97.5, 18.3, 5.5)
  ctx.restore()

  // Oyuncular
  const names = new Map(s.players.map((p) => [p.id, p.name]))
  const drawTeam = (team: Team, side: TeamSide) => {
    team.slots.forEach((pid, i) => {
      if (!pid) return
      const pos = slotPos(team, side, i)
      const x = ox + (pos.x / 100) * W
      const y = oy + (pos.y / 100) * H
      const r = 30
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fillStyle = team.color
      ctx.shadowColor = 'rgba(0,0,0,.35)'
      ctx.shadowBlur = 10
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.lineWidth = 4
      ctx.strokeStyle = 'rgba(255,255,255,.95)'
      ctx.stroke()
      const name = names.get(pid) ?? ''
      ctx.fillStyle = textColorOn(team.color)
      ctx.font = font(800, 22)
      ctx.fillText(initials(name), x, y + 1)
      // İsim etiketi
      ctx.font = font(700, 20)
      const label = fitText(ctx, name, 150)
      const tw = ctx.measureText(label).width + 16
      ctx.fillStyle = 'rgba(0,0,0,.55)'
      ctx.beginPath()
      ctx.roundRect(x - tw / 2, y + r + 6, tw, 28, 6)
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.fillText(label, x, y + r + 21)
    })
  }
  drawTeam(s.teamB, 'B')
  drawTeam(s.teamA, 'A')

  // Takım etiketleri
  const tag = (team: Team, y: number) => {
    ctx.font = font(700, 18)
    const tw = ctx.measureText(team.name).width + 46
    ctx.fillStyle = 'rgba(0,0,0,.45)'
    ctx.beginPath()
    ctx.roundRect(ox + 16, y - 16, tw, 32, 16)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(ox + 34, y, 7, 0, Math.PI * 2)
    ctx.fillStyle = team.color
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'left'
    ctx.fillText(team.name, ox + 48, y + 1)
    ctx.textAlign = 'center'
  }
  tag(s.teamB, oy + 34)
  tag(s.teamA, oy + H - 34)

  // Alt yazı
  ctx.font = font(600, 18)
  ctx.fillStyle = '#64748b'
  ctx.fillText('Halısaha · Kadro Kurucu', canvas.width / 2, oy + H + FOOTER / 2 + 8)

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Görsel oluşturulamadı'))), 'image/png'))
}

/** Telefonda paylaşım menüsünü açar (WhatsApp vb.), olmazsa dosyayı indirir. */
export const shareOrDownloadPng = async (blob: Blob, fileName: string): Promise<'shared' | 'downloaded'> => {
  const file = new File([blob], fileName, { type: 'image/png' })
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
  if (nav.share && nav.canShare?.({ files: [file] }) && matchMedia('(pointer: coarse)').matches) {
    try {
      await nav.share({ files: [file], title: 'Kadro' })
      return 'shared'
    } catch {
      /* kullanıcı vazgeçti ya da desteklenmiyor → indir */
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return 'downloaded'
}
