import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../store/StoreContext'
import { EmptyState, Icon, PageHeader } from '../components/ui'
import { normalizeCode } from '../lib/groups'

type Preview = { id: string; name: string; members: number; admins: string[] }

/** Davet linki (/katil/<kod>): grubu gösterir, tek tıkla katılım */
export default function JoinGroupPage() {
  const { kod = '' } = useParams()
  const store = useStore()
  const { data } = store
  const nav = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const code = normalizeCode(kod)
  // undefined = yükleniyor, null = bulunamadı
  const [group, setGroup] = useState<Preview | null | undefined>(undefined)
  const { previewInvite } = store
  useEffect(() => {
    let alive = true
    void previewInvite(code).then((g) => alive && setGroup(g))
    return () => {
      alive = false
    }
  }, [code, previewInvite])
  const me = data.currentUserId

  if (group === undefined) return <div className="p-8 text-center text-sm text-muted">Davet yükleniyor…</div>
  if (group && me && data.groups.find((g) => g.id === group.id)?.memberIds.includes(me)) return <Navigate to={`/grup/${group.id}`} replace />

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

  const join = async () => {
    setBusy(true)
    const r = await store.joinGroupByCode(code)
    setBusy(false)
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
            {group.members} üye{group.admins.length > 0 && ` · Yönetici: ${group.admins.slice(0, 2).join(', ')}`}
          </div>
        </div>
        <p className="text-sm text-muted">Gruba katılınca maçlara katılımını bildirebilir, kadroya girebilir ve maç sonrası oylamaya katılabilirsin.</p>
        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        <button onClick={join} disabled={busy} className="btn-primary w-full py-3">
          <Icon name="users" size={18} /> {busy ? 'Katılınıyor…' : 'Gruba katıl'}
        </button>
      </div>
    </div>
  )
}
