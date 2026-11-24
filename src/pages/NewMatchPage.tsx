import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useStore } from '../store/StoreContext'
import { EmptyState, PageHeader } from '../components/ui'
import { adminGroups } from '../lib/groups'
import { PLAYERS_PER_SIDE_OPTIONS, TEAM_COLORS } from '../lib/constants'
import { todayISO } from '../lib/utils'

export default function NewMatchPage() {
  const { data, createMatch } = useStore()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const groups = adminGroups(data)
  const initialGroup = groups.find((g) => g.id === params.get('grup'))?.id ?? groups[0]?.id ?? ''
  const lastVenue = (gid: string) =>
    [...data.matches].filter((m) => m.groupId === gid).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0]?.venue ?? ''
  const [form, setForm] = useState({
    groupId: initialGroup,
    date: todayISO(),
    time: '21:00',
    venue: lastVenue(initialGroup),
    playersPerSide: 7,
    teamAName: 'Kırmızılar',
    teamAColor: TEAM_COLORS[0]!,
    teamBName: 'Maviler',
    teamBColor: TEAM_COLORS[1]!,
  })
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const m = createMatch(form)
    nav(`/mac/${m.id}`, { replace: true })
  }

  if (!groups.length)
    return (
      <div className="p-4">
        <PageHeader title="Yeni maç" />
        <EmptyState
          title="Önce bir grup gerekiyor"
          text="Maçlar bir gruba ait olur. Kendi grubunu kur ya da yöneticisi olduğun bir gruptan maç oluştur."
          action={<Link to="/gruplarim" className="btn-primary">Gruplarım</Link>}
        />
      </div>
    )

  return (
    <form onSubmit={submit}>
      <PageHeader title="Yeni maç" />
      <div className="space-y-4 px-4">
        {groups.length > 1 && (
          <div className="card p-4">
            <label className="label" htmlFor="grp">Grup</label>
            <select
              id="grp"
              className="input"
              value={form.groupId}
              onChange={(e) => setForm((f) => ({ ...f, groupId: e.target.value, venue: f.venue || lastVenue(e.target.value) }))}
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
        )}
        {groups.length === 1 && <p className="px-1 text-sm text-muted">Grup: <b className="text-ink">{groups[0]!.name}</b></p>}
        <div className="card space-y-4 p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Gün</label>
              <input type="date" required className="input" value={form.date} onChange={(e) => set('date', e.target.value)} />
            </div>
            <div>
              <label className="label">Saat</label>
              <input type="time" required className="input" value={form.time} onChange={(e) => set('time', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Saha</label>
            <input className="input" placeholder="Örn: Yıldız Halı Saha" value={form.venue} onChange={(e) => set('venue', e.target.value)} />
          </div>
        </div>

        <div className="card p-4">
          <label className="label">Kişi sayısı (takım başı, kaleci dahil)</label>
          <div className="grid grid-cols-7 gap-1.5">
            {PLAYERS_PER_SIDE_OPTIONS.map((n) => (
              <button
                type="button"
                key={n}
                onClick={() => set('playersPerSide', n)}
                className={`rounded-xl py-2.5 text-sm font-bold transition ${form.playersPerSide === n ? 'bg-brand text-white' : 'bg-surface-2 text-ink hover:bg-line'}`}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">
            {form.playersPerSide}v{form.playersPerSide} · toplam {form.playersPerSide * 2} oyuncu
          </p>
        </div>

        {(['A', 'B'] as const).map((side) => {
          const nameKey = side === 'A' ? 'teamAName' : 'teamBName'
          const colorKey = side === 'A' ? 'teamAColor' : 'teamBColor'
          return (
            <div key={side} className="card space-y-3 p-4">
              <label className="label">{side === 'A' ? '1. Takım' : '2. Takım'}</label>
              <input className="input" required value={form[nameKey]} onChange={(e) => set(nameKey, e.target.value)} />
              <div className="flex gap-2">
                {TEAM_COLORS.map((c) => (
                  <button
                    type="button"
                    key={c}
                    aria-label={`Renk ${c}`}
                    onClick={() => set(colorKey, c)}
                    className={`h-8 w-8 rounded-full border-2 transition ${form[colorKey] === c ? 'scale-110 border-white' : 'border-transparent'}`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
          )
        })}

        <button type="submit" className="btn-primary w-full py-3">Maçı oluştur ve kadroyu kur</button>
      </div>
    </form>
  )
}
