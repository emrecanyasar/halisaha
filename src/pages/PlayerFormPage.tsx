import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useStore } from '../store/StoreContext'
import { ConfirmButton, EmptyState, Icon, PageHeader } from '../components/ui'
import { canEditPlayer, isAdmin } from '../lib/groups'
import { POSITION_LABELS } from '../lib/constants'
import { SHIRT_SIZES, type Foot, type Position, type ShirtSize } from '../types'

export default function PlayerFormPage() {
  const { id } = useParams()
  const store = useStore()
  const nav = useNavigate()
  const existing = store.data.players.find((p) => p.id === id)
  const [params] = useSearchParams()
  // Yeni oyuncu bir gruba eklenir (?grup=<id>); sadece o grubun yöneticisi ekleyebilir
  const group = store.data.groups.find((g) => g.id === params.get('grup'))
  const allowed = existing ? canEditPlayer(store.data, existing.id) : isAdmin(group, store.data.currentUserId) && !group?.demo
  const hasAccount = !!existing && store.data.accounts.some((a) => a.playerId === existing.id)
  const [f, setF] = useState({
    name: existing?.name ?? '',
    position: existing?.position ?? ('OS' as Position),
    number: existing?.number ?? 0,
    foot: existing?.foot ?? ('Sağ' as Foot),
    size: existing?.size as ShirtSize | undefined,
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload = { ...f, name: f.name.trim() }
    if (!payload.name) return
    if (existing) {
      store.updatePlayer(existing.id, payload)
      nav(-1)
    } else {
      store.addPlayer(payload, group!.id)
      nav(`/grup/${group!.id}?sekme=uyeler`, { replace: true })
    }
  }

  if (!allowed)
    return (
      <div className="p-4">
        <PageHeader title="Oyuncu" />
        <EmptyState
          title="Bu işlem için yetkin yok"
          text={existing ? 'Hesabı olan oyuncunun profilini sadece kendisi düzenleyebilir.' : 'Oyuncuyu bir grubun yöneticisi ekleyebilir.'}
          action={<Link to="/gruplarim" className="btn-ghost">Gruplarım</Link>}
        />
      </div>
    )

  return (
    <form onSubmit={submit}>
      <PageHeader title={existing ? 'Oyuncuyu düzenle' : `${group?.name ?? ''} · yeni oyuncu`} />
      <div className="space-y-4 px-4">
        <div className="card space-y-4 p-4">
          <div>
            <label className="label">Ad soyad</label>
            <input className="input" required autoFocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Örn: Ahmet Yılmaz" />
          </div>
          <div>
            <label className="label">Mevki</label>
            <div className="grid grid-cols-4 gap-1.5">
              {(Object.keys(POSITION_LABELS) as Position[]).map((p) => (
                <button type="button" key={p} onClick={() => setF({ ...f, position: p })} className={`rounded-xl py-2 text-xs font-semibold ${f.position === p ? 'bg-brand text-white' : 'bg-surface-2'}`}>
                  {POSITION_LABELS[p]}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Forma no</label>
              <input type="number" min={0} max={99} className="input" value={f.number || ''} onChange={(e) => setF({ ...f, number: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label">Ayak</label>
              <select className="input" value={f.foot} onChange={(e) => setF({ ...f, foot: e.target.value as Foot })}>
                <option>Sağ</option>
                <option>Sol</option>
                <option>İki</option>
              </select>
            </div>
            <div>
              <label className="label">Beden</label>
              <select className="input" value={f.size ?? ''} onChange={(e) => setF({ ...f, size: (e.target.value || undefined) as ShirtSize | undefined })}>
                <option value="">–</option>
                {SHIRT_SIZES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <p className="px-1 text-xs text-muted">Özellik puanları elle girilmez; maç sonrası oylamalardan otomatik hesaplanır.</p>
        <button type="submit" className="btn-primary w-full py-3">{existing ? 'Kaydet' : 'Oyuncuyu ekle'}</button>
        {existing && !hasAccount && (
          <ConfirmButton
            danger
            className="btn-danger w-full"
            question={`${existing.name} silinecek. Verdiği ve aldığı oylar da silinir. Emin misin?`}
            onConfirm={() => {
              store.deletePlayer(existing.id)
              nav('/gruplarim', { replace: true })
            }}
          >
            <Icon name="trash" size={16} /> Oyuncuyu sil
          </ConfirmButton>
        )}
      </div>
    </form>
  )
}
