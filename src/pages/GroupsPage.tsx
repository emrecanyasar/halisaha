import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../store/StoreContext'
import { Icon } from '../components/ui'
import { myGroups } from '../lib/groups'
import { formatDayHeader } from '../lib/utils'

/** Üye olunan gruplar, yeni grup kurma ve davet koduyla katılma */
export default function GroupsPage() {
  const store = useStore()
  const { data } = store
  const nav = useNavigate()
  const groups = myGroups(data)
  const me = data.currentUserId!

  const [name, setName] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)

  const create = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim().length < 2) return
    const g = store.createGroup(name, isPublic)
    if (g) nav(`/grup/${g.id}?sekme=uyeler`)
  }
  const join = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const r = await store.joinGroupByCode(code)
    if (r.ok) nav(`/grup/${r.groupId}`)
    else setError(r.error)
  }

  const nextMatch = (gid: string) =>
    data.matches
      .filter((m) => m.groupId === gid && m.status === 'planned')
      .sort((a, b) => (a.date + a.time < b.date + b.time ? -1 : 1))[0]

  return (
    <div className="space-y-5 p-4 lg:px-0">
      <div>
        <h1 className="text-2xl font-extrabold">Gruplarım</h1>
        <p className="mt-1 text-sm text-muted">Halı saha ekiplerin: maçları planla, kadroyu kur, maçtan sonra oyla.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="space-y-3">
          {groups.length === 0 && (
            <div className="card flex flex-col items-center gap-2 px-6 py-10 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand/10 text-brand">
                <Icon name="users" size={24} />
              </span>
              <div className="font-semibold">Henüz bir grupta değilsin</div>
              <p className="max-w-sm text-sm text-muted">Kendi grubunu kur ve arkadaşlarına davet linki gönder ya da sana gelen davet koduyla bir gruba katıl.</p>
            </div>
          )}
          {groups.map((g) => {
            const next = nextMatch(g.id)
            const admin = g.adminIds.includes(me)
            return (
              <Link key={g.id} to={`/grup/${g.id}`} className="card flex items-center gap-4 p-4 transition hover:border-brand/40">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand text-lg font-extrabold text-white">
                  {g.name[0]?.toLocaleUpperCase('tr')}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-bold">{g.name}</span>
                    {admin && <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">Yönetici</span>}
                  </div>
                  <div className="mt-0.5 text-xs text-muted">
                    {g.memberIds.length} üye · {g.isPublic ? 'Herkese açık' : 'Özel'}
                  </div>
                  <div className="mt-1.5 truncate text-xs">
                    {next ? (
                      <span className="font-medium text-brand">
                        Sıradaki: <span className="capitalize">{formatDayHeader(next.date)}</span> · {next.time}
                      </span>
                    ) : (
                      <span className="text-muted">Planlanmış maç yok</span>
                    )}
                  </div>
                </div>
                <Icon name="arrow" size={18} className="text-slate-400" />
              </Link>
            )
          })}
        </div>

        <div className="space-y-4">
          <form onSubmit={create} className="card space-y-3 p-4">
            <h2 className="font-bold">Yeni grup kur</h2>
            <div>
              <label className="label" htmlFor="gname">Grup adı</label>
              <input id="gname" className="input" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} placeholder="Örn: Perşembe Akşamı Halı Saha" />
            </div>
            <label className="flex items-start gap-2.5 text-sm">
              <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[var(--color-brand)]" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
              <span>
                Maçlar herkese açık olsun
                <span className="block text-xs text-muted">Açık grupların maçları ana sayfada görünür. Gruba katılmak her zaman davet kodu ister.</span>
              </span>
            </label>
            <button type="submit" disabled={name.trim().length < 2} className="btn-primary w-full">
              <Icon name="plus" size={18} /> Grubu kur
            </button>
          </form>

          <form onSubmit={join} className="card space-y-3 p-4">
            <h2 className="font-bold">Davet koduyla katıl</h2>
            <input
              className="input text-center font-mono text-lg tracking-[0.3em] uppercase"
              maxLength={8}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="ABC123"
              aria-label="Davet kodu"
            />
            {error && <p className="text-xs font-medium text-red-600">{error}</p>}
            <button type="submit" disabled={code.trim().length < 4} className="btn-ghost w-full">
              Katıl
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
