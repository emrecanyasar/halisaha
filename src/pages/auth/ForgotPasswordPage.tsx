import { useState } from 'react'
import { Link } from 'react-router-dom'
import { isValidEmail } from '../../lib/auth'
import { Icon } from '../../components/ui'
import { AuthTitle, FormError } from './common'

/** Şimdilik sadece arayüz: backend gelince sıfırlama e-postası buradan gönderilecek. */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (sent)
    return (
      <div className="space-y-4 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-soft text-brand">
          <Icon name="check" size={28} />
        </span>
        <AuthTitle title="E-postanı kontrol et" sub={`${email} adresine kayıtlı bir hesap varsa şifre sıfırlama bağlantısı gönderilecek.`} />
        <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
          Deneme sürümünde e-posta gönderimi yok. Bu özellik sunucu tarafı eklenince çalışacak.
        </p>
        <Link to="/giris" className="btn-primary w-full py-3">Girişe dön</Link>
      </div>
    )

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (!isValidEmail(email)) return setError('Geçerli bir e-posta adresi gir.')
        setSent(true)
      }}
    >
      <AuthTitle title="Şifreni mi unuttun?" sub="E-posta adresini yaz, sana sıfırlama bağlantısı gönderelim." />
      <FormError msg={error} />
      <div>
        <label className="label" htmlFor="femail">E-posta</label>
        <input id="femail" type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ornek@mail.com" />
      </div>
      <button type="submit" className="btn-primary w-full py-3">Bağlantı gönder</button>
      <p className="text-center text-sm text-muted">
        <Link to="/giris" className="font-semibold text-brand">← Girişe dön</Link>
      </p>
    </form>
  )
}
