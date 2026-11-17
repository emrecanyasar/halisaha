import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store/StoreContext'
import { Avatar, EmptyState, Icon, RatingBadge } from '../components/ui'
import { POSITION_LABELS } from '../lib/constants'
import { playerSummary } from '../lib/stats'
import { attrColor } from '../lib/utils'

type Sort = 'ovr' | 'rating' | 'goals' | 'mvps'
const SORTS: { id: Sort; label: string }[] = [
  { id: 'ovr', label: 'Genel' },
  { id: 'rating', label: 'Ort. rating' },
  { id: 'goals', label: 'Gol' },
  { id: 'mvps', label: 'MVP' },
]

export default function PlayersPage() {
  const { data } = useStore()
  const [sort, setSort] = useState<Sort>('ovr')
  const rows = useMemo(() => {
    const s = data.players.map((p) => playerSummary(data, p))
    const key = (x: (typeof s)[number]) =>
      sort === 'ovr' ? x.ovr ?? -1 : sort === 'rating' ? x.avgRating ?? -1 : sort === 'goals' ? x.goals : x.mvps
    return s.sort((a, b) => key(b) - key(a) || a.player.name.localeCompare(b.player.name, 'tr'))
  }, [data, sort])

  return (
    <div>
      <div className="flex items-center justify-between px-4 pt-4">
        <h1 className="text-2xl font-extrabold">Oyuncular</h1>
        <Link to="/oyuncu/yeni" className="btn-primary">
          <Icon name="plus" size={18} /> Ekle
        </Link>
      </div>
      <div className="flex gap-2 overflow-x-auto px-4 py-3">
        {SORTS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSort(s.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${sort === s.id ? 'bg-white text-black' : 'bg-surface-2 text-muted'}`}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="px-4">
        {rows.length === 0 ? (
          <EmptyState title="Henüz oyuncu yok" text="Halısaha ekibini ekleyerek başla." action={<Link to="/oyuncu/yeni" className="btn-primary">Oyuncu ekle</Link>} />
        ) : (
          <div className="card divide-y divide-line overflow-hidden">
            {rows.map((r, i) => (
              <Link key={r.player.id} to={`/oyuncu/${r.player.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
                <span className="w-5 text-center text-xs font-semibold text-muted">{i + 1}</span>
                <Avatar player={r.player} size={38} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{r.player.name}</div>
                  <div className="text-xs text-muted">
                    {POSITION_LABELS[r.player.position]} · {r.matches} maç · {r.goals} gol{r.mvps > 0 && ` · ⭐${r.mvps}`}
                  </div>
                </div>
                <RatingBadge value={r.avgRating} size="sm" />
                <span
                  className="grid h-9 w-9 place-items-center rounded-lg text-sm font-extrabold"
                  style={{ background: r.ovr != null ? attrColor(r.ovr) + '33' : '#1c2433', color: r.ovr != null ? attrColor(r.ovr) : '#8b95a8' }}
                  title="Genel puan (özelliklerin ortalaması)"
                >
                  {r.ovr ?? '–'}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
