import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useStore } from '../store/StoreContext'
import { Avatar, Icon } from './ui'

const NAV = [
  { to: '/', label: 'Maçlar', icon: 'ball', end: true },
  { to: '/oyuncular', label: 'Oyuncular', icon: 'users', end: false },
  { to: '/ayarlar', label: 'Ayarlar', icon: 'settings', end: false },
]

export default function Layout() {
  const { data } = useStore()
  const me = data.players.find((p) => p.id === data.currentUserId)
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-bg/90 px-4 py-3 backdrop-blur">
        <Link to="/" className="flex items-center gap-2 font-extrabold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-black">
            <Icon name="ball" size={18} />
          </span>
          <span className="text-lg">
            Halı<span className="text-brand">saha</span>
          </span>
        </Link>
        <Link to="/ayarlar" className="flex items-center gap-2 rounded-full bg-surface py-1 pl-3 pr-1 text-xs text-muted hover:bg-surface-2">
          {me ? (
            <>
              <span className="max-w-28 truncate text-white">{me.name}</span>
              <Avatar player={me} size={26} color="#16a34a" />
            </>
          ) : (
            <span className="py-1.5 pr-2">Kim olduğunu seç</span>
          )}
        </Link>
      </header>

      <main className="flex-1 pb-24">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
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
  )
}
