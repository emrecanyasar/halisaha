import { useState, type InputHTMLAttributes } from 'react'
import { passwordStrength } from '../../lib/auth'

export function PasswordInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input {...props} type={show ? 'text' : 'password'} className="input pr-16" />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute inset-y-0 right-2 my-auto h-7 rounded-md px-2 text-xs font-semibold text-muted hover:bg-surface-2"
      >
        {show ? 'Gizle' : 'Göster'}
      </button>
    </div>
  )
}

export function StrengthMeter({ password }: { password: string }) {
  if (!password) return null
  const s = passwordStrength(password)
  const labels = ['Çok zayıf', 'Zayıf', 'Orta', 'İyi', 'Güçlü']
  const colors = ['#dc2626', '#ea580c', '#d97706', '#16a34a', '#15803d']
  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="h-1 flex-1 rounded-full" style={{ background: i < s ? colors[s] : '#e3e7ee' }} />
        ))}
      </div>
      <div className="mt-1 text-[11px]" style={{ color: colors[s] }}>
        {labels[s]}
      </div>
    </div>
  )
}

export function FormError({ msg }: { msg: string | null }) {
  if (!msg) return null
  return <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{msg}</div>
}

export function AuthTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-extrabold">{title}</h1>
      {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
    </div>
  )
}
