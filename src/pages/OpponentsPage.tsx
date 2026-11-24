import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useStore } from '../store/StoreContext'
import { ConfirmButton, EmptyState, Icon } from '../components/ui'
import { PLAYERS_PER_SIDE_OPTIONS } from '../lib/constants'
import { FEE_LABELS, LEVEL_LABELS, LEVEL_STYLES, formatPhone, intlPhone } from '../lib/opponents'
import { isMember } from '../lib/groups'
import { formatDayHeader, parseDate, todayISO, toISODate } from '../lib/utils'
import type { OpponentAd, OpponentLevel } from '../types'

type When = 'all' | 'today' | 'week' | 'weekend'
const WHEN: { id: When; label: string }[] = [
  { id: 'all', label: 'Tüm tarihler' },
  { id: 'today', label: 'Bugün' },
  { id: 'week', label: '7 gün içinde' },
  { id: 'weekend', label: 'Hafta sonu' },
]

const addDays = (iso: string, n: number) => {
  const d = parseDate(iso)
  d.setDate(d.getDate() + n)
  return toISODate(d)
}

/** Rakip ilanları: liste herkese açık, telefon ve ilan verme giriş ister */
export default function OpponentsPage() {
  const { data } = useStore()
  const { pathname } = useLocation()
  const me = data.currentUserId && data.players.some((p) => p.id === data.currentUserId) ? data.currentUserId : null
  const [when, setWhen] = useState<When>('all')
  const [size, setSize] = useState<number | 'all'>('all')
  const [level, setLevel] = useState<OpponentLevel | 'all'>('all')

  const today = todayISO()
  const { list, mine } = useMemo(() => {
    const inWhen = (d: string) => {
      if (when === 'all') return true
      if (when === 'today') return d === today
      if (when === 'week') return d <= addDays(today, 7)
      const day = parseDate(d).getDay() // 0 Pazar, 6 Cumartesi
      return (day === 0 || day === 6) && d <= addDays(today, 7)
    }
    const key = (a: OpponentAd) => a.date + a.time
    const list = data.opponentAds
      .filter((a) => a.status === 'open' && a.date >= today)
      .filter((a) => inWhen(a.date) && (size === 'all' || a.playersPerSide === size) && (level === 'all' || a.level === level))
      .sort((a, b) => (key(a) < key(b) ? -1 : 1))
    const mine = me ? data.opponentAds.filter((a) => a.ownerId === me).sort((a, b) => (key(a) < key(b) ? 1 : -1)) : []
    return { list, mine }
  }, [data.opponentAds, when, size, level, today, me])

  const chip = (on: boolean) => `shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${on ? 'border-brand bg-brand text-white' : 'border-line bg-surface text-muted hover:text-ink'}`

  return (
    <div className="space-y-4 p-4 lg:px-0">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Rakip Bul</h1>
          <p className="mt-1 text-sm text-muted">Sahası ayarlı, rakip arayan takımlar. Uygun olanı ara ya da kendi ilanını ver.</p>
        </div>
        <Link to={me ? '/rakip/yeni' : '/giris'} state={me ? undefined : { from: '/rakip/yeni' }} className="btn-primary shrink-0">
          <Icon name="plus" size={18} /> İlan ver
        </Link>
      </div>

      <div className="space-y-2">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {WHEN.map((w) => (
            <button key={w.id} onClick={() => setWhen(w.id)} className={chip(when === w.id)}>{w.label}</button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={size} onChange={(e) => setSize(e.target.value === 'all' ? 'all' : Number(e.target.value))} className="input w-auto py-1.5 text-xs" aria-label="Kişi sayısı">
            <option value="all">Her kişi sayısı</option>
            {PLAYERS_PER_SIDE_OPTIONS.map((n) => (
              <option key={n} value={n}>{n}v{n}</option>
            ))}
          </select>
          {(['all', 'amator', 'orta', 'iyi'] as const).map((l) => (
            <button key={l} onClick={() => setLevel(l)} className={chip(level === l)}>{l === 'all' ? 'Her seviye' : LEVEL_LABELS[l]}</button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState
          title="Bu filtrelere uygun ilan yok"
          text="Filtreleri genişlet ya da rakip aradığını duyurmak için ilan ver."
          action={<Link to={me ? '/rakip/yeni' : '/giris'} state={me ? undefined : { from: '/rakip/yeni' }} className="btn-primary">İlan ver</Link>}
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {list.map((a) => (
            <AdCard key={a.id} ad={a} me={me} loginFrom={pathname} />
          ))}
        </div>
      )}

      {mine.length > 0 && (
        <section className="pt-2">
          <div className="section-title">İlanlarım</div>
          <div className="grid gap-3 lg:grid-cols-2">
            {mine.map((a) => (
              <AdCard key={a.id} ad={a} me={me} loginFrom={pathname} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function AdCard({ ad, me, loginFrom }: { ad: OpponentAd; me: string | null; loginFrom: string }) {
  const store = useStore()
  const { data } = store
  const group = ad.groupId ? data.groups.find((g) => g.id === ad.groupId) : undefined
  const canOpenGroup = !!group && (group.isPublic || isMember(group, me))
  const owner = me === ad.ownerId
  const past = ad.date < todayISO()
  const closed = ad.status === 'closed'
  const wa = `https://wa.me/${intlPhone(ad.phone)}?text=${encodeURIComponent(`Merhaba, Halısaha'daki ilanınızı gördüm (${formatDayHeader(ad.date)} ${ad.time}, ${ad.venue}). Rakip olarak gelmek isteriz.`)}`

  return (
    <article className={`card flex flex-col p-4 ${closed || past ? 'opacity-70' : ''}`}>
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand/10 text-lg font-extrabold text-brand">
          {ad.teamName[0]?.toLocaleUpperCase('tr')}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h2 className="truncate font-bold">{ad.teamName}</h2>
            {owner && <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-bold text-brand">Senin ilanın</span>}
            {closed && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-bold text-muted">Rakip bulundu</span>}
            {!closed && past && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-bold text-muted">Tarihi geçti</span>}
          </div>
          {group && (
            canOpenGroup ? (
              <Link to={`/grup/${group.id}`} className="text-xs font-medium text-brand hover:underline">{group.name}</Link>
            ) : (
              <span className="text-xs text-muted">{group.name}</span>
            )
          )}
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${LEVEL_STYLES[ad.level]}`}>{LEVEL_LABELS[ad.level]}</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
        <div className="col-span-2 flex items-center gap-2">
          <Icon name="clock" size={16} className="shrink-0 text-muted" />
          <span className="font-semibold capitalize">{formatDayHeader(ad.date)}</span>
          <span className="text-muted">· {ad.time}</span>
        </div>
        <div className="col-span-2 flex items-center gap-2">
          <Icon name="pin" size={16} className="shrink-0 text-muted" />
          <span className="truncate">{ad.venue}</span>
        </div>
        <div className="flex items-center gap-2">
          <Icon name="users" size={16} className="shrink-0 text-muted" />
          <span>{ad.playersPerSide}v{ad.playersPerSide}</span>
        </div>
        <div className="col-span-2 text-xs text-muted">{FEE_LABELS[ad.feeSplit]}</div>
      </div>
      {ad.note && <p className="mt-2 rounded-xl bg-surface-2/70 px-3 py-2 text-sm">{ad.note}</p>}

      <div className="mt-auto pt-3">
        {owner ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
            <span className="mr-auto text-xs text-muted">Telefon: {formatPhone(ad.phone)}</span>
            {closed ? (
              <button onClick={() => store.setAdStatus(ad.id, 'open')} className="btn-ghost py-1.5 text-xs">Tekrar aç</button>
            ) : (
              <button onClick={() => store.setAdStatus(ad.id, 'closed')} className="btn-primary py-1.5 text-xs">
                <Icon name="check" size={14} /> Rakip bulundu
              </button>
            )}
            <ConfirmButton danger className="rounded-xl px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50" question="İlan silinecek. Emin misin?" onConfirm={() => store.deleteAd(ad.id)}>
              Sil
            </ConfirmButton>
          </div>
        ) : me ? (
          <div className="flex gap-2 border-t border-line pt-3">
            <a href={`tel:${formatPhone(ad.phone).replace(/\s/g, '')}`} className="btn-ghost flex-1 py-2">
              <Icon name="phone" size={16} /> {formatPhone(ad.phone)}
            </a>
            <a href={wa} target="_blank" rel="noreferrer" className="btn-primary py-2">
              WhatsApp
            </a>
          </div>
        ) : (
          <Link to="/giris" state={{ from: loginFrom }} className="btn-ghost w-full border-t-0 py-2">
            <Icon name="lock" size={16} /> Telefonu görmek için giriş yap
          </Link>
        )}
      </div>
    </article>
  )
}
