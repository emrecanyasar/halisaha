import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../../store/StoreContext'
import { isValidEmail } from '../../lib/auth'
import { isDemoPlayer } from '../../lib/groups'
import { POSITION_LABELS } from '../../lib/constants'
import type { Foot, Position } from '../../types'
import { AuthTitle, FormError, PasswordInput, StrengthMeter } from './common'

export default function RegisterPage() {
  const { register, data } = useStore()
  const nav = useNavigate()
  const loc = useLocation()
  const unclaimed = useMemo(
    () =>
      data.players
        .filter((p) => !isDemoPlayer(p.id) && !data.accounts.some((a) => a.playerId === p.id))
        .sort((a, b) => a.name.localeCompare(b.name, 'tr')),
    [data.players, data.accounts],
  )
  const [f, setF] = useState({
    name: '',
    email: '',
    password: '',
    password2: '',
    claimPlayerId: '' as string,
    position: 'OS' as Position,
    number: 0,
    foot: 'Sağ' as Foot,
    terms: false,
  })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!f.claimPlayerId && f.name.trim().length < 2) return setError('Adını yaz.')
    if (!isValidEmail(f.email)) return setError('Geçerli bir e-posta adresi gir.')
    if (f.password.length < 6) return setError('Şifre en az 6 karakter olmalı.')
    if (f.password !== f.password2) return setError('Şifreler eşleşmiyor.')
    if (!f.terms) return setError('Devam etmek için kuralları kabul et.')
    setBusy(true)
    const r = await register({
      name: f.claimPlayerId ? f.name || data.players.find((p) => p.id === f.claimPlayerId)!.name : f.name,
      email: f.email,
      password: f.password,
      claimPlayerId: f.claimPlayerId || null,
      position: f.position,
      number: f.number,
      foot: f.foot,
    })
    setBusy(false)
    if (!r.ok) return setError(r.error)
    // Yeni kullanıcı (davet linkiyle gelmediyse) grup kurmak / katılmak için Gruplarım'a gider
    nav((loc.state as { from?: string } | null)?.from ?? '/gruplarim', { replace: true })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <AuthTitle title="Hesap oluştur" sub="Ekibe katıl, maçlardan sonra oy ver." />
      <FormError msg={error} />

      {unclaimed.length > 0 && (
        <div className="rounded-xl border border-line bg-surface p-3">
          <label className="label" htmlFor="claim">Ekipte zaten profilin var mı?</label>
          <select
            id="claim"
            className="input"
            value={f.claimPlayerId}
            onChange={(e) => {
              const p = data.players.find((x) => x.id === e.target.value)
              setF((x) => ({ ...x, claimPlayerId: e.target.value, name: p?.name ?? x.name }))
            }}
          >
            <option value="">Hayır, yeni profil oluştur</option>
            {unclaimed.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <p className="mt-1.5 text-[11px] text-muted">Seçersen geçmiş maçların, ratinglerin ve özelliklerin bu hesaba bağlanır.</p>
        </div>
      )}

      <div>
        <label className="label" htmlFor="name">Ad soyad</label>
        <input id="name" className="input" autoComplete="name" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Örn: Ahmet Yılmaz" />
      </div>
      <div>
        <label className="label" htmlFor="remail">E-posta</label>
        <input id="remail" type="email" required autoComplete="email" className="input" value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="ornek@mail.com" />
      </div>
      <div>
        <label className="label" htmlFor="rpass">Şifre</label>
        <PasswordInput id="rpass" required autoComplete="new-password" value={f.password} onChange={(e) => set('password', e.target.value)} placeholder="En az 6 karakter" />
        <StrengthMeter password={f.password} />
      </div>
      <div>
        <label className="label" htmlFor="rpass2">Şifre (tekrar)</label>
        <PasswordInput id="rpass2" required autoComplete="new-password" value={f.password2} onChange={(e) => set('password2', e.target.value)} />
      </div>

      {!f.claimPlayerId && (
        <div className="space-y-3 rounded-xl border border-line bg-surface p-3">
          <div>
            <div className="label">Mevki</div>
            <div className="grid grid-cols-4 gap-1.5">
              {(Object.keys(POSITION_LABELS) as Position[]).map((p) => (
                <button type="button" key={p} onClick={() => set('position', p)} className={`rounded-lg py-2 text-xs font-semibold ${f.position === p ? 'bg-brand text-white' : 'bg-surface-2'}`}>
                  {POSITION_LABELS[p]}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="num">Forma no</label>
              <input id="num" type="number" min={0} max={99} className="input" value={f.number || ''} onChange={(e) => set('number', Number(e.target.value))} />
            </div>
            <div>
              <label className="label" htmlFor="foot">Ayak</label>
              <select id="foot" className="input" value={f.foot} onChange={(e) => set('foot', e.target.value as Foot)}>
                <option>Sağ</option>
                <option>Sol</option>
                <option>İki</option>
              </select>
            </div>
          </div>
        </div>
      )}

      <label className="flex items-start gap-2 text-xs text-muted">
        <input type="checkbox" className="mt-0.5 accent-[var(--color-brand)]" checked={f.terms} onChange={(e) => set('terms', e.target.checked)} />
        <span>Oyların gizli tutulacağını ve puanlamayı centilmence yapacağımı kabul ediyorum.</span>
      </label>

      <button type="submit" disabled={busy} className="btn-primary w-full py-3">{busy ? 'Hesap oluşturuluyor…' : 'Kayıt ol'}</button>
      <p className="text-center text-sm text-muted">
        Zaten hesabın var mı? <Link to="/giris" state={loc.state} className="font-semibold text-brand">Giriş yap</Link>
      </p>
    </form>
  )
}
