import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/StoreContext'
import { PageHeader } from '../components/ui'
import { PLAYERS_PER_SIDE_OPTIONS, TEAM_COLORS } from '../lib/constants'
import { todayISO } from '../lib/utils'

export default function NewMatchPage() {
  const { data, createMatch } = useStore()
  const nav = useNavigate()
  const lastVenue = [...data.matches].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0]?.venue ?? ''
  const [form, setForm] = useState({
    date: todayISO(),
    time: '21:00',
    venue: lastVenue,
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

  return (
    <form onSubmit={submit}>
      <PageHeader title="Yeni maç" />
      <div className="space-y-4 px-4">
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
                className={`rounded-xl py-2.5 text-sm font-bold transition ${form.playersPerSide === n ? 'bg-brand text-white' : 'bg-surface-2 text-white hover:bg-line'}`}
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
