import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../../store/StoreContext'
import { AuthTitle, FormError, PasswordInput } from './common'

export default function LoginPage() {
  const { login, data } = useStore()
  const noAccounts = data.accounts.length === 0
  const nav = useNavigate()
  const loc = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const r = await login(email, password)
    setBusy(false)
    if (!r.ok) return setError(r.error)
    nav((loc.state as { from?: string } | null)?.from ?? '/', { replace: true })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <AuthTitle title="Tekrar hoş geldin" sub="Maçlarını ve ratinglerini görmek için giriş yap." />
      {noAccounts && (
        <div className="rounded-xl border border-brand/30 bg-brand-soft px-3 py-2.5 text-sm text-green-800">
          Henüz hesap yok. <Link to="/kayit" className="font-semibold underline">Kayıt ol</Link> ve kadrodaki profilini seç.
        </div>
      )}
      <FormError msg={error} />
      <div>
        <label className="label" htmlFor="email">E-posta</label>
        <input id="email" type="email" required autoComplete="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ornek@mail.com" />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <label className="label" htmlFor="password">Şifre</label>
          <Link to="/sifremi-unuttum" className="mb-1.5 text-xs font-semibold text-brand">Şifremi unuttum</Link>
        </div>
        <PasswordInput id="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <button type="submit" disabled={busy} className="btn-primary w-full py-3">{busy ? 'Giriş yapılıyor…' : 'Giriş yap'}</button>
      <p className="text-center text-sm text-muted">
        Hesabın yok mu?{' '}
        <Link to="/kayit" state={loc.state} className="font-semibold text-brand">Kayıt ol</Link>
      </p>

    </form>
  )
}
