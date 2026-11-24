import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/StoreContext'
import { PageHeader } from '../components/ui'
import { PLAYERS_PER_SIDE_OPTIONS } from '../lib/constants'
import { FEE_LABELS, LEVEL_LABELS, isValidPhone } from '../lib/opponents'
import { myGroups } from '../lib/groups'
import { todayISO } from '../lib/utils'
import type { FeeSplit, OpponentLevel } from '../types'

/** Rakip arıyoruz ilanı ver */
export default function NewOpponentAdPage() {
  const store = useStore()
  const { data } = store
  const nav = useNavigate()
  const groups = myGroups(data)
  // Kullanıcının daha önce verdiği ilandaki telefonu hatırla
  const lastPhone = [...data.opponentAds].reverse().find((a) => a.ownerId === data.currentUserId)?.phone ?? ''
  const first = groups[0]
  const lastVenue = first ? [...data.matches].filter((m) => m.groupId === first.id).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0]?.venue : undefined

  const [f, setF] = useState({
    groupId: first?.id ?? '',
    teamName: first?.name ?? '',
    date: todayISO(),
    time: '21:00',
    venue: lastVenue ?? '',
    playersPerSide: 7,
    level: 'orta' as OpponentLevel,
    feeSplit: 'yari' as FeeSplit,
    phone: lastPhone,
    note: '',
  })
  const [error, setError] = useState<string | null>(null)
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (f.teamName.trim().length < 2) return setError('Takım adını yaz.')
    if (!f.venue.trim()) return setError('Sahayı yaz.')
    if (f.date < todayISO()) return setError('Geçmiş bir tarih seçilemez.')
    if (!isValidPhone(f.phone)) return setError('Geçerli bir cep telefonu yaz (örn. 0532 123 45 67).')
    store.createAd({
      groupId: f.groupId || undefined,
      teamName: f.teamName.trim(),
      date: f.date,
      time: f.time,
      venue: f.venue.trim(),
      playersPerSide: f.playersPerSide,
      level: f.level,
      feeSplit: f.feeSplit,
      phone: f.phone.trim(),
      note: f.note.trim() || undefined,
    })
    nav('/rakip', { replace: true })
  }

  const pill = (on: boolean) => `rounded-xl py-2.5 text-sm font-semibold transition ${on ? 'bg-brand text-white' : 'bg-surface-2 text-ink hover:bg-line'}`

  return (
    <form onSubmit={submit} className="lg:max-w-2xl">
      <PageHeader title="Rakip ilanı ver" />
      <div className="space-y-4 px-4 lg:px-0">
        <div className="card space-y-4 p-4">
          {groups.length > 0 && (
            <div>
              <label className="label" htmlFor="ad-group">Grup (isteğe bağlı)</label>
              <select
                id="ad-group"
                className="input"
                value={f.groupId}
                onChange={(e) => {
                  const g = groups.find((x) => x.id === e.target.value)
                  setF((x) => ({ ...x, groupId: e.target.value, teamName: g && (x.teamName === '' || groups.some((y) => y.name === x.teamName)) ? g.name : x.teamName }))
                }}
              >
                <option value="">Grup yok</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="label" htmlFor="ad-team">Takım adı</label>
            <input id="ad-team" className="input" maxLength={40} value={f.teamName} onChange={(e) => set('teamName', e.target.value)} placeholder="Örn: Perşembe Ekibi" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="ad-date">Gün</label>
              <input id="ad-date" type="date" min={todayISO()} required className="input" value={f.date} onChange={(e) => set('date', e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="ad-time">Saat</label>
              <input id="ad-time" type="time" required className="input" value={f.time} onChange={(e) => set('time', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="ad-venue">Saha</label>
            <input id="ad-venue" className="input" value={f.venue} onChange={(e) => set('venue', e.target.value)} placeholder="Örn: Yıldız Halı Saha, Kadıköy" />
          </div>
        </div>

        <div className="card space-y-4 p-4">
          <div>
            <div className="label">Kaça kaç</div>
            <div className="grid grid-cols-7 gap-1.5">
              {PLAYERS_PER_SIDE_OPTIONS.map((n) => (
                <button type="button" key={n} onClick={() => set('playersPerSide', n)} className={pill(f.playersPerSide === n)}>{n}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="label">Seviye</div>
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.keys(LEVEL_LABELS) as OpponentLevel[]).map((l) => (
                <button type="button" key={l} onClick={() => set('level', l)} className={pill(f.level === l)}>{LEVEL_LABELS[l]}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="label">Saha ücreti</div>
            <div className="space-y-1.5">
              {(Object.keys(FEE_LABELS) as FeeSplit[]).map((k) => (
                <label key={k} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm ${f.feeSplit === k ? 'border-brand bg-brand/5 font-semibold' : 'border-line'}`}>
                  <input type="radio" name="fee" className="accent-[var(--color-brand)]" checked={f.feeSplit === k} onChange={() => set('feeSplit', k)} />
                  {FEE_LABELS[k]}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="card space-y-4 p-4">
          <div>
            <label className="label" htmlFor="ad-phone">Telefon</label>
            <input id="ad-phone" type="tel" inputMode="tel" className="input" value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="0532 123 45 67" />
            <p className="mt-1 text-xs text-muted">Sadece giriş yapmış kullanıcılar görür. Rakipler seni arar ya da WhatsApp'tan yazar.</p>
          </div>
          <div>
            <label className="label" htmlFor="ad-note">Not (isteğe bağlı)</label>
            <textarea id="ad-note" rows={3} maxLength={200} className="input resize-y" value={f.note} onChange={(e) => set('note', e.target.value)} placeholder="Örn: Saha ayarlı, kaleciniz olsun." />
          </div>
        </div>

        {error && <p className="px-1 text-sm font-medium text-red-600">{error}</p>}
        <button type="submit" className="btn-primary w-full py-3">İlanı yayınla</button>
      </div>
    </form>
  )
}
