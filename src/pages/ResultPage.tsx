import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useGroupAccess, usePlayerMap, useStore } from '../store/StoreContext'
import { EmptyState, Icon, PageHeader } from '../components/ui'
import { teamPlayers } from '../lib/stats'
import { uid } from '../lib/utils'
import type { Goal, TeamSide } from '../types'

export default function ResultPage() {
  const { id } = useParams()
  const store = useStore()
  const players = usePlayerMap()
  const nav = useNavigate()
  const match = store.data.matches.find((m) => m.id === id)
  const [goals, setGoals] = useState<Goal[]>(match?.goals ?? [])
  const { canEdit } = useGroupAccess(match?.groupId)

  if (!match) return <EmptyState title="Maç bulunamadı" />
  if (!canEdit)
    return (
      <div className="p-4">
        <PageHeader title="Skor" />
        <EmptyState title="Bu maçı sadece grup yöneticileri düzenleyebilir" />
      </div>
    )
  const finished = match.status === 'finished'
  const count = (side: TeamSide) => goals.filter((g) => g.team === side).length
  const addGoal = (side: TeamSide) => setGoals((g) => [...g, { id: uid(), team: side, scorerId: null, assistId: null }])
  const removeLast = (side: TeamSide) =>
    setGoals((gs) => {
      const i = gs.map((g) => g.team).lastIndexOf(side)
      return i === -1 ? gs : gs.filter((_, j) => j !== i)
    })
  const update = (gid: string, patch: Partial<Goal>) => setGoals((gs) => gs.map((g) => (g.id === gid ? { ...g, ...patch } : g)))

  const save = () => {
    if (finished) store.setGoals(match.id, goals)
    else store.finishMatch(match.id, goals)
    nav(`/mac/${match.id}`, { replace: true })
  }

  return (
    <div>
      <PageHeader title={finished ? 'Skoru düzenle' : 'Maçı bitir'} />
      <div className="space-y-4 px-4">
        <div className="card grid grid-cols-2 divide-x divide-line">
          {(['A', 'B'] as const).map((side) => {
            const team = side === 'A' ? match.teamA : match.teamB
            return (
              <div key={side} className="flex flex-col items-center gap-3 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <span className="h-3 w-3 rounded-sm" style={{ background: team.color }} /> {team.name}
                </div>
                <div className="flex items-center gap-4">
                  <button className="grid h-10 w-10 place-items-center rounded-full bg-surface-2 text-xl" onClick={() => removeLast(side)} aria-label="Gol sil">−</button>
                  <span className="w-10 text-center text-4xl font-extrabold tabular-nums">{count(side)}</span>
                  <button className="grid h-10 w-10 place-items-center rounded-full bg-brand text-xl text-white" onClick={() => addGoal(side)} aria-label="Gol ekle">+</button>
                </div>
              </div>
            )
          })}
        </div>

        {goals.length > 0 && (
          <div>
            <div className="section-title">Goller · golcü ve asist (isteğe bağlı)</div>
            <div className="card divide-y divide-line">
              {goals.map((g, i) => {
                const team = g.team === 'A' ? match.teamA : match.teamB
                const pool = teamPlayers(match, g.team)
                return (
                  <div key={g.id} className="flex items-center gap-2 p-3">
                    <span className="w-6 text-xs text-muted">{i + 1}.</span>
                    <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: team.color }} />
                    <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                    <select className="input py-2" value={g.scorerId ?? ''} onChange={(e) => update(g.id, { scorerId: e.target.value || null })}>
                      <option value="">Golcü (bilinmiyor / K.K.)</option>
                      {pool.map((pid) => (
                        <option key={pid} value={pid}>{players.get(pid)?.name}</option>
                      ))}
                    </select>
                    <select className="input py-2" value={g.assistId ?? ''} onChange={(e) => update(g.id, { assistId: e.target.value || null })}>
                      <option value="">Asist yok</option>
                      {pool.filter((pid) => pid !== g.scorerId).map((pid) => (
                        <option key={pid} value={pid}>{players.get(pid)?.name}</option>
                      ))}
                    </select>
                    </div>
                    <button className="p-1 text-muted hover:text-red-400" onClick={() => setGoals((gs) => gs.filter((x) => x.id !== g.id))} aria-label="Sil">
                      <Icon name="close" size={16} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {!finished && (
          <p className="rounded-xl bg-surface-2 p-3 text-xs text-muted">
            Kaydedince maç “bitti” olarak işaretlenir ve oynayan herkes için kapalı oylama açılır.
          </p>
        )}
        <button className="btn-primary w-full py-3" onClick={save}>
          {finished ? 'Kaydet' : 'Maçı bitir ve oylamayı aç'}
        </button>
      </div>
    </div>
  )
}
