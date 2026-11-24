import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../store/StoreContext'
import { EmptyState, Icon, PageHeader } from '../components/ui'
import { normalizeCode } from '../lib/groups'

/** Davet linki (/katil/<kod>): grubu gösterir, tek tıkla katılım */
export default function JoinGroupPage() {
  const { kod = '' } = useParams()
  const store = useStore()
  const { data } = store
  const nav = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const code = normalizeCode(kod)
  const group = data.groups.find((g) => !g.demo && g.inviteCode === code)
  const me = data.currentUserId

  if (group && me && group.memberIds.includes(me)) return <Navigate to={`/grup/${group.id}`} replace />

  if (!group)
    return (
      <div className="p-4">
        <PageHeader title="Davet" />
        <EmptyState
          title="Davet geçersiz"
          text="Bu davet kodu bulunamadı ya da yenilenmiş olabilir. Grup yöneticisinden yeni link iste."
          action={<Link to="/gruplarim" className="btn-ghost">Gruplarım</Link>}
        />
      </div>
    )

  const admins = data.players.filter((p) => group.adminIds.includes(p.id)).map((p) => p.name)
  const join = () => {
    const r = store.joinGroupByCode(code)
    if (r.ok) nav(`/grup/${r.groupId}`, { replace: true })
    else setError(r.error)
  }

  return (
    <div className="p-4">
      <PageHeader title="Gruba davet" />
      <div className="card mx-auto max-w-md space-y-4 p-6 text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-brand text-3xl font-extrabold text-white">
          {group.name[0]?.toLocaleUpperCase('tr')}
        </span>
        <div>
          <div className="text-xl font-extrabold">{group.name}</div>
          <div className="mt-1 text-sm text-muted">
            {group.memberIds.length} üye{admins.length > 0 && ` · Yönetici: ${admins.slice(0, 2).join(', ')}`}
          </div>
        </div>
        <p className="text-sm text-muted">Gruba katılınca maçlara katılımını bildirebilir, kadroya girebilir ve maç sonrası oylamaya katılabilirsin.</p>
        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        <button onClick={join} className="btn-primary w-full py-3">
          <Icon name="users" size={18} /> Gruba katıl
        </button>
      </div>
    </div>
  )
}
