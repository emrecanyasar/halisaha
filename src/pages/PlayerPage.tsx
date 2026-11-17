import { Link, useParams } from 'react-router-dom'
import { useStore } from '../store/StoreContext'
import { AttrBars, FormChart, RadarChart } from '../components/Charts'
import { Avatar, EmptyState, Icon, PageHeader, RatingBadge, Stat } from '../components/ui'
import { POSITION_LABELS } from '../lib/constants'
import { playerSummary, score, sideOf } from '../lib/stats'
import { formatShortDate } from '../lib/utils'

export default function PlayerPage() {
  const { id } = useParams()
  const { data } = useStore()
  const player = data.players.find((p) => p.id === id)
  if (!player)
    return (
      <div className="p-4">
        <PageHeader title="Oyuncu" />
        <EmptyState title="Oyuncu bulunamadı" />
      </div>
    )
  const s = playerSummary(data, player)

  return (
    <div>
      <PageHeader
        title={player.name}
        right={
          <Link to={`/oyuncu/${player.id}/duzenle`} className="rounded-full p-2 hover:bg-surface-2" aria-label="Düzenle">
            <Icon name="edit" />
          </Link>
        }
      />
      <div className="space-y-4 px-4">
        {/* Profil kartı */}
        <div className="card p-4">
          <div className="flex items-center gap-4">
            <Avatar player={player} size={72} color="#16a34a" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-xl font-extrabold">{player.name}</div>
              <div className="text-sm text-muted">{POSITION_LABELS[player.position]}</div>
              {data.currentUserId === player.id && <span className="mt-1 inline-block rounded-full bg-brand/15 px-2 py-0.5 text-[11px] font-semibold text-brand">Sen</span>}
            </div>
            <div className="flex flex-col items-center">
              <span className="text-3xl font-extrabold leading-none">{s.ovr ?? '–'}</span>
              <span className="text-[10px] font-semibold uppercase text-muted">Genel</span>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2 border-t border-line pt-4">
            <Stat label="Forma" value={player.number || '–'} />
            <Stat label="Ayak" value={player.foot} />
            <Stat label="Mevki" value={player.position} />
            <Stat label="Maç" value={s.matches} />
          </div>
        </div>

        {/* Radar + ortalama rating */}
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Özellikler</h2>
            <div className="flex items-center gap-2 text-sm text-muted">
              Ort. rating <RatingBadge value={s.avgRating} />
            </div>
          </div>
          <div className="flex justify-center">
            <RadarChart attrs={s.attrs} />
          </div>
          {!s.attrs && <p className="text-center text-xs text-muted">Özellikler maç sonrası oylamalarla belirlenir. Henüz yeterli oy yok.</p>}
          <div className="mt-2">
            <AttrBars attrs={s.attrs} />
          </div>
        </div>

        {/* Form */}
        <div className="card p-4">
          <h2 className="mb-3 font-bold">Son maçlar</h2>
          <FormChart form={s.form} />
        </div>

        {/* İstatistik */}
        <div className="card grid grid-cols-3 gap-y-4 p-4">
          <Stat label="Galibiyet" value={s.wins} />
          <Stat label="Beraberlik" value={s.draws} />
          <Stat label="Mağlubiyet" value={s.losses} />
          <Stat label="Gol" value={s.goals} />
          <Stat label="Asist" value={s.assists} />
          <Stat label="Maçın oyuncusu" value={s.mvps} />
        </div>

        {/* Maç listesi */}
        {s.form.length > 0 && (
          <div>
            <div className="section-title">Maç geçmişi</div>
            <div className="card divide-y divide-line overflow-hidden">
              {[...s.form].reverse().map(({ match, rating, result }) => {
                const sc = score(match)
                const side = sideOf(match, player.id)
                const my = side === 'A' ? match.teamA : match.teamB
                const opp = side === 'A' ? match.teamB : match.teamA
                return (
                  <Link key={match.id} to={`/mac/${match.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
                    <span className="w-12 text-xs text-muted">{formatShortDate(match.date)}</span>
                    <span className={`grid h-5 w-5 place-items-center rounded text-[10px] font-bold text-white ${result === 'G' ? 'bg-green-600' : result === 'B' ? 'bg-slate-500' : 'bg-red-600'}`}>
                      {result}
                    </span>
                    <span className="flex-1 truncate text-sm">
                      {my.name} <span className="font-bold tabular-nums">{side === 'A' ? `${sc.a}-${sc.b}` : `${sc.b}-${sc.a}`}</span> {opp.name}
                    </span>
                    <RatingBadge value={rating} size="sm" />
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
