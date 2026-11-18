import { Link, Navigate, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useStore } from '../store/StoreContext'
import { Avatar, Icon } from './ui'

const NAV = [
  { to: '/', label: 'Maçlar', icon: 'ball', end: true },
  { to: '/oyuncular', label: 'Oyuncular', icon: 'users', end: false },
  { to: '/ayarlar', label: 'Ayarlar', icon: 'settings', end: false },
]

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 font-extrabold tracking-tight">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-white">
        <Icon name="ball" size={18} />
      </span>
      <span className="text-lg">
        Halı<span className="text-brand">saha</span>
      </span>
    </Link>
  )
}

/** Uygulama çerçevesi. Giriş yapılmadıysa giriş sayfasına yönlendirir.
 *  Mobil: üst bar + alt menü. Masaüstü (lg+): sol kenar çubuğu. */
export default function Layout() {
  const { data } = useStore()
  const me = data.players.find((p) => p.id === data.currentUserId)
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  if (!me) return <Navigate to="/giris" replace state={{ from: pathname }} />

  return (
    <div className="min-h-screen lg:flex">
      {/* Masaüstü kenar çubuğu */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-surface px-4 py-5 lg:flex">
        <div className="px-2">
          <Logo />
        </div>
        <Link to="/mac/yeni" className="btn-primary mt-6">
          <Icon name="plus" size={18} /> Maç oluştur
        </Link>
        <nav className="mt-6 space-y-1">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                  isActive ? 'bg-brand-soft text-brand' : 'text-muted hover:bg-surface-2 hover:text-ink'
                }`
              }
            >
              <Icon name={n.icon} size={20} />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <Link to="/profil" className="mt-auto flex items-center gap-3 rounded-xl border border-line p-2.5 hover:bg-surface-2">
          <Avatar player={me} size={36} color="#16a34a" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{me.name}</div>
            <div className="text-xs text-muted">Hesabım</div>
          </div>
        </Link>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        {/* Mobil üst bar */}
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-surface/90 px-4 py-3 backdrop-blur lg:hidden">
          <Logo />
          <Link to="/profil" className="flex items-center gap-2 rounded-full bg-surface-2 py-1 pl-3 pr-1 text-xs">
            <span className="max-w-28 truncate font-medium">{me.name}</span>
            <Avatar player={me} size={26} color="#16a34a" />
          </Link>
        </header>

        <main className="mx-auto w-full max-w-2xl flex-1 pb-24 lg:max-w-6xl lg:px-6 lg:pb-10 lg:pt-2">
          <Outlet />
        </main>

        {/* Mobil alt menü */}
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-2xl">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${isActive ? 'text-brand' : 'text-muted'}`
                }
              >
                <Icon name={n.icon} size={22} />
                {n.label}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  )
}
