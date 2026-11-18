import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useStore } from '../store/StoreContext'
import { Icon } from './ui'

/** Giriş / kayıt sayfalarının çerçevesi: masaüstünde solda tanıtım paneli, sağda form. */
export default function AuthLayout() {
  const { data } = useStore()
  const loc = useLocation()
  const loggedIn = !!data.currentUserId && data.players.some((p) => p.id === data.currentUserId)
  if (loggedIn) return <Navigate to={(loc.state as { from?: string } | null)?.from ?? '/'} replace />

  return (
    <div className="flex min-h-screen bg-bg">
      <aside className="relative hidden w-[46%] max-w-2xl overflow-hidden bg-gradient-to-br from-green-600 via-green-700 to-emerald-900 p-12 text-white lg:flex lg:flex-col">
        <PitchBackdrop />
        <div className="relative flex items-center gap-2 text-xl font-extrabold">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-green-700">
            <Icon name="ball" size={22} />
          </span>
          Halısaha
        </div>
        <div className="relative mt-auto max-w-md">
          <h2 className="text-4xl font-extrabold leading-tight">Halısaha maçlarının Sofascore’u.</h2>
          <p className="mt-4 text-green-50/90">
            Maçı planla, kadroyu kur, maçtan sonra takım arkadaşlarını gizlice puanla. Ratingler ve özellikler oylardan oluşsun.
          </p>
          <ul className="mt-8 space-y-3 text-sm">
            {['Kapalı oylama, kim kime ne verdi görünmez', 'Her maç için oyuncu ratingleri ve maçın oyuncusu', 'Oylarla şekillenen oyuncu kartları'].map((t) => (
              <li key={t} className="flex items-center gap-3">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-white/20">
                  <Icon name="check" size={14} />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative mt-10 text-xs text-green-100/70">Deneme sürümü · v0.2</div>
      </aside>

      <main className="flex flex-1 flex-col items-center justify-center px-5 py-10">
        <div className="mb-8 flex items-center gap-2 text-xl font-extrabold lg:hidden">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand text-white">
            <Icon name="ball" size={22} />
          </span>
          <span>
            Halı<span className="text-brand">saha</span>
          </span>
        </div>
        <div className="w-full max-w-sm">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

function PitchBackdrop() {
  return (
    <svg viewBox="0 0 105 68" className="absolute -right-24 top-1/2 h-[120%] -translate-y-1/2 rotate-90 opacity-[.12]" aria-hidden>
      <g fill="none" stroke="#fff" strokeWidth=".5">
        <rect x="1" y="1" width="103" height="66" />
        <line x1="52.5" y1="1" x2="52.5" y2="67" />
        <circle cx="52.5" cy="34" r="9.15" />
        <rect x="1" y="13.85" width="16.5" height="40.3" />
        <rect x="87.5" y="13.85" width="16.5" height="40.3" />
        <rect x="1" y="24.85" width="5.5" height="18.3" />
        <rect x="98.5" y="24.85" width="5.5" height="18.3" />
      </g>
    </svg>
  )
}
