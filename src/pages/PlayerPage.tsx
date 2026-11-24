import { Link, useParams } from 'react-router-dom'
import { canEditPlayer, isMember } from '../lib/groups'
import type { AppData } from '../types'
import { useStore } from '../store/StoreContext'
import { AttrBars, FormChart, RadarChart } from '../components/Charts'
import { Avatar, EmptyState, Icon, PageHeader, RatingBadge, Stat } from '../components/ui'
import PlayerCard from '../components/PlayerCard'
import { POSITION_LABELS } from '../lib/constants'
import { participants, playerSummary, score, sideOf } from '../lib/stats'
import { formatShortDate } from '../lib/utils'
import { useIsDesktop } from '../lib/hooks'

export default function PlayerPage() {
  const { id } = useParams()
  const { data } = useStore()
  const player = data.players.find((p) => p.id === id)
  const isDesktop = useIsDesktop()
  if (!player)
    return (
      <div className="p-4">
        <PageHeader title="Oyuncu" />
        <EmptyState title="Oyuncu bulunamadı" />
      </div>
    )
  const s = playerSummary(data, player)

  // Kart kimliktir: tüm gruplardaki oylardan oluşur. Gruplar ayrıca kendi istatistikleriyle listelenir.
  const groupsOf = data.groups.filter((g) => g.memberIds.includes(player.id))
  const visibleGroupsOf = groupsOf.filter((g) => g.isPublic || isMember(g, data.currentUserId))
  const groupStats = visibleGroupsOf
    .map((g) => {
      const ids = new Set(data.matches.filter((m) => m.groupId === g.id).map((m) => m.id))
      const scoped: AppData = { ...data, matches: data.matches.filter((m) => ids.has(m.id)), votes: data.votes.filter((v) => ids.has(v.matchId)) }
      return { group: g, s: playerSummary(scoped, player), admin: g.adminIds.includes(player.id) }
    })
    .sort((a, b) => b.s.matches - a.s.matches || a.group.name.localeCompare(b.group.name, 'tr'))
  // Kartta görünen kısaltma: en çok maç yaptığı grup
  const primaryGroup = groupStats[0]?.group ?? groupsOf[0]
  const groupName = (gid: string) => data.groups.find((g) => g.id === gid)?.name
  const upcoming = data.matches
    .filter((m) => m.status === 'planned' && (participants(m).includes(player.id) || m.attendance?.[player.id] === 'yes'))
    .filter((m) => visibleGroupsOf.some((g) => g.id === m.groupId))
    .sort((a, b) => (a.date + a.time < b.date + b.time ? -1 : 1))

  const groupsCard = groupStats.length > 0 && (
    <div>
      <div className="section-title">Grupları</div>
      <div className="card divide-y divide-line overflow-hidden">
        {groupStats.map(({ group, s: gs, admin }) => {
          const canOpen = group.isPublic || isMember(group, data.currentUserId)
          const body = (
            <>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand/10 text-sm font-extrabold text-brand">
                {group.name[0]?.toLocaleUpperCase('tr')}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 truncate text-sm font-semibold">
                  {group.name}
                  {admin && <span className="rounded bg-amber-100 px-1 text-[10px] font-bold text-amber-800">Yönetici</span>}
                </div>
                <div className="text-xs text-muted">
                  {gs.matches} maç · {gs.goals} gol · {gs.assists} asist{gs.mvps > 0 && ` · ⭐${gs.mvps}`}
                </div>
              </div>
              <RatingBadge value={gs.avgRating} size="sm" />
            </>
          )
          return canOpen ? (
            <Link key={group.id} to={`/grup/${group.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">{body}</Link>
          ) : (
            <div key={group.id} className="flex items-center gap-3 px-4 py-3">{body}</div>
          )
        })}
      </div>
    </div>
  )

  const upcomingCard = upcoming.length > 0 && (
    <div>
      <div className="section-title">Yaklaşan maçları</div>
      <div className="card divide-y divide-line overflow-hidden">
        {upcoming.map((m) => {
          const side = sideOf(m, player.id)
          const team = side === 'A' ? m.teamA : side === 'B' ? m.teamB : null
          return (
            <Link key={m.id} to={`/mac/${m.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
              <div className="w-14 shrink-0 text-xs">
                <div className="font-semibold">{formatShortDate(m.date)}</div>
                <div className="text-muted">{m.time}</div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{m.teamA.name} – {m.teamB.name}</div>
                <div className="truncate text-xs text-muted">{groupName(m.groupId)}{m.venue && ` · ${m.venue}`}</div>
              </div>
              {team ? (
                <span className="flex shrink-0 items-center gap-1 text-[11px] font-semibold">
                  <span className="h-2.5 w-2.5 rounded-full ring-1 ring-black/10" style={{ background: team.color }} />
                  {team.name}
                </span>
              ) : (
                <span className="shrink-0 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-700">Geliyor</span>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )

  const profile = (
    <>
        {/* FIFA tarzı kart */}
        <div className="card overflow-hidden py-6" style={{ background: 'radial-gradient(120% 80% at 50% 0%, #e8f7ee 0%, #ffffff 60%)' }}>
          <PlayerCard player={player} attrs={s.attrs} ovr={s.ovr} club={primaryGroup?.name ?? 'Halısaha'} votes={s.attrVotes} />
          <p className="mx-auto mt-4 max-w-xs px-4 text-center text-[11px] text-muted">
            Kart, oyuncunun {groupsOf.length > 1 ? `${groupsOf.length} gruptaki ` : ''}tüm maçlarında aldığı kapalı oylardan oluşur.
          </p>
        </div>
        {/* Profil kartı */}
        <div className="card p-4">
          <div className="flex items-center gap-4">
            <Avatar player={player} size={72} color="#16a34a" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-xl font-extrabold">{player.name}</div>
              <div className="text-sm text-muted">{POSITION_LABELS[player.position]}</div>
              {data.currentUserId === player.id && <span className="mt-1 inline-block rounded-full bg-brand/15 px-2 py-0.5 text-[11px] font-semibold text-brand">Sen</span>}
            </div>
            <div className="flex flex-col items-center gap-1">
              <RatingBadge value={s.avgRating} size="lg" />
              <span className="text-[10px] font-semibold uppercase text-muted">Ort. rating</span>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-5 gap-2 border-t border-line pt-4">
            <Stat label="Forma" value={player.number || '–'} />
            <Stat label="Ayak" value={player.foot} />
            <Stat label="Mevki" value={player.position} />
            <Stat label="Beden" value={player.size ?? '–'} />
            <Stat label="Maç" value={s.matches} />
          </div>
        </div>

      </>
  )
  const radar = (
    <>
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

      </>
  )
  const formCard = (
    <>
        {/* Form */}
        <div className="card p-4">
          <h2 className="mb-3 font-bold">Son maçlar</h2>
          <FormChart form={s.form} />
        </div>

      </>
  )
  const stats = (
    <>
        {/* İstatistik */}
        <div className="card grid grid-cols-3 gap-y-4 p-4">
          <Stat label="Galibiyet" value={s.wins} />
          <Stat label="Beraberlik" value={s.draws} />
          <Stat label="Mağlubiyet" value={s.losses} />
          <Stat label="Gol" value={s.goals} />
          <Stat label="Asist" value={s.assists} />
          <Stat label="Maçın oyuncusu" value={s.mvps} />
        </div>

      </>
  )
  const history = (
    <>
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
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">
                        {my.name} <span className="font-bold tabular-nums">{side === 'A' ? `${sc.a}-${sc.b}` : `${sc.b}-${sc.a}`}</span> {opp.name}
                      </span>
                      {groupsOf.length > 1 && <span className="block truncate text-[11px] text-muted">{groupName(match.groupId)}</span>}
                    </span>
                    <RatingBadge value={rating} size="sm" />
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </>
  )

  return (
    <div>
      <PageHeader
        title={player.name}
        right={
          canEditPlayer(data, player.id) ? (
            <Link to={`/oyuncu/${player.id}/duzenle`} className="rounded-full p-2 hover:bg-surface-2" aria-label="Düzenle">
              <Icon name="edit" />
            </Link>
          ) : undefined
        }
      />
      {isDesktop ? (
        <div className="grid grid-cols-2 items-start gap-6 px-4">
          <div className="space-y-4">
            {profile}
            {stats}
            {groupsCard}
            {history}
          </div>
          <div className="space-y-4">
            {radar}
            {formCard}
            {upcomingCard}
          </div>
        </div>
      ) : (
        <div className="space-y-4 px-4">
          {profile}
          {upcomingCard}
          {radar}
          {formCard}
          {stats}
          {groupsCard}
          {history}
        </div>
      )}
    </div>
  )
}
