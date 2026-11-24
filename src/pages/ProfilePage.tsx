import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../store/StoreContext'
import { Avatar, Icon, PageHeader } from '../components/ui'
import { POSITION_LABELS } from '../lib/constants'
import { isValidEmail } from '../lib/auth'
import { PasswordInput, StrengthMeter } from './auth/common'

export default function ProfilePage() {
  const store = useStore()
  const { data } = store
  const nav = useNavigate()
  const me = data.players.find((p) => p.id === data.currentUserId)!
  const account = data.accounts.find((a) => a.playerId === me.id)

  const [name, setName] = useState(me.name)
  const [email, setEmail] = useState(account?.email ?? '')
  const [infoMsg, setInfoMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const [pw, setPw] = useState({ current: '', next: '', next2: '' })
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const saveInfo = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim().length < 2) return setInfoMsg({ ok: false, text: 'Adını yaz.' })
    if (account) {
      if (!isValidEmail(email)) return setInfoMsg({ ok: false, text: 'Geçerli bir e-posta gir.' })
      const r = store.updateEmail(me.id, email)
      if (!r.ok) return setInfoMsg({ ok: false, text: r.error })
    }
    store.updatePlayer(me.id, { name: name.trim() })
    setInfoMsg({ ok: true, text: 'Bilgiler kaydedildi.' })
  }

  const savePw = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pw.next.length < 6) return setPwMsg({ ok: false, text: 'Yeni şifre en az 6 karakter olmalı.' })
    if (pw.next !== pw.next2) return setPwMsg({ ok: false, text: 'Yeni şifreler eşleşmiyor.' })
    const r = await store.changePassword(me.id, pw.current, pw.next)
    if (!r.ok) return setPwMsg({ ok: false, text: r.error })
    setPw({ current: '', next: '', next2: '' })
    setPwMsg({ ok: true, text: 'Şifren güncellendi.' })
  }

  return (
    <div>
      <PageHeader title="Hesabım" />
      <div className="grid gap-4 px-4 lg:grid-cols-2 lg:items-start">
        <div className="space-y-4">
          <div className="card flex items-center gap-4 p-4">
            <Avatar player={me} size={64} color="#16a34a" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-lg font-extrabold">{me.name}</div>
              <div className="truncate text-sm text-muted">{account?.email ?? 'Hesap bağlı değil (test oturumu)'}</div>
              <div className="text-xs text-muted">{POSITION_LABELS[me.position]}{me.number ? ` · #${me.number}` : ''}</div>
            </div>
          </div>
          <Link to={`/oyuncu/${me.id}`} className="card flex items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-surface-2">
            Oyuncu kartımı gör <span className="text-muted">→</span>
          </Link>
          <Link to="/gruplarim" className="card flex items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-surface-2">
            Gruplarım ({store.data.groups.filter((g) => g.memberIds.includes(me.id)).length}) <span className="text-muted">→</span>
          </Link>
          <Link to={`/oyuncu/${me.id}/duzenle`} className="card flex items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-surface-2">
            Mevki, forma no ve ayak bilgisi <span className="text-muted">→</span>
          </Link>
          <button
            className="btn-danger w-full"
            onClick={() => {
              store.logout()
              nav('/', { replace: true })
            }}
          >
            Çıkış yap
          </button>
        </div>

        <div className="space-y-4">
          <form onSubmit={saveInfo} className="card space-y-3 p-4">
            <h2 className="font-bold">Kişisel bilgiler</h2>
            <div>
              <label className="label" htmlFor="pname">Ad soyad</label>
              <input id="pname" className="input" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            {account && (
              <div>
                <label className="label" htmlFor="pemail">E-posta</label>
                <input id="pemail" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            )}
            {infoMsg && <p className={`text-xs ${infoMsg.ok ? 'text-brand' : 'text-red-600'}`}>{infoMsg.text}</p>}
            <button className="btn-primary w-full">Kaydet</button>
          </form>

          {account && (
            <form onSubmit={savePw} className="card space-y-3 p-4">
              <h2 className="flex items-center gap-2 font-bold"><Icon name="lock" size={16} /> Şifre değiştir</h2>
              <div>
                <label className="label" htmlFor="cur">Mevcut şifre</label>
                <PasswordInput id="cur" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
              </div>
              <div>
                <label className="label" htmlFor="nw">Yeni şifre</label>
                <PasswordInput id="nw" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
                <StrengthMeter password={pw.next} />
              </div>
              <div>
                <label className="label" htmlFor="nw2">Yeni şifre (tekrar)</label>
                <PasswordInput id="nw2" autoComplete="new-password" value={pw.next2} onChange={(e) => setPw({ ...pw, next2: e.target.value })} />
              </div>
              {pwMsg && <p className={`text-xs ${pwMsg.ok ? 'text-brand' : 'text-red-600'}`}>{pwMsg.text}</p>}
              <button className="btn-ghost w-full" disabled={!pw.current || !pw.next}>Şifreyi güncelle</button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
