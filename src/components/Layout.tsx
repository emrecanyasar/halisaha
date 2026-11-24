import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useMemo } from 'react'
import { playerSummary } from '../lib/stats'
import { attrColor } from '../lib/utils'
import { useStore } from '../store/StoreContext'
import { Avatar, Icon } from './ui'
import { adminGroups } from '../lib/groups'

const NAV = [
  { to: '/', label: 'Maçlar', icon: 'ball', end: true, auth: false },
  { to: '/kadro', label: 'Kadro Kur', icon: 'lineup', end: false, auth: false },
  { to: '/rakip', label: 'Rakip Bul', icon: 'megaphone', end: false, auth: false },
  { to: '/gruplarim', label: 'Gruplarım', icon: 'users', end: false, auth: true },
]

function Logo({ club }: { club?: string }) {
  return (
    <Link to="/" className="flex items-center gap-2.5 font-extrabold tracking-tight">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand text-white">
        <Icon name="ball" size={18} />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-lg">
          Halı<span className="text-brand">saha</span>
        </span>
        {club && <span className="max-w-56 truncate text-[11px] font-medium text-muted">{club}</span>}
      </span>
    </Link>
  )
}

/** Uygulama çerçevesi. Giriş zorunlu değil; giriş yapılmadıysa sağ üstte "Giriş yap" gösterilir.
 *  Mobil: üst bar + alt menü. Masaüstü (lg+): menülü üst başlık. */
export default function Layout() {
  const { data } = useStore()
  const me = data.players.find((p) => p.id === data.currentUserId)
  const { pathname } = useLocation()
  const nav = NAV.filter((n) => !n.auth || me)
  // Kart puanı (kimlik): tüm gruplardaki oylardan
  const myOvr = useMemo(() => (me ? playerSummary(data, me).ovr : null), [data, me])
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-6 px-4 lg:h-16 lg:px-6">
          <div className="lg:hidden">
            <Logo />
          </div>
          <div className="hidden lg:block">
            <Logo />
          </div>

          {/* Masaüstü menü */}
          <nav className="hidden flex-1 items-center gap-1 lg:flex">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `relative flex h-16 items-center gap-2 px-3 text-sm font-semibold transition ${
                    isActive ? 'text-brand' : 'text-muted hover:text-ink'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon name={n.icon} size={18} />
                    {n.label}
                    {isActive && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-brand" />}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {me && adminGroups(data).length > 0 && (
              <Link to="/mac/yeni" className="btn-primary hidden py-2 lg:inline-flex">
                <Icon name="plus" size={18} /> Maç oluştur
              </Link>
            )}
            {me ? (
              <Link to="/profil" className="flex items-center gap-2 rounded-full bg-surface-2 py-1 pl-3 pr-1 text-xs hover:bg-line lg:text-sm" title="Hesabım">
                <span className="max-w-28 truncate font-medium lg:max-w-40">{me.name}</span>
                <span
                  className="rounded-md px-1.5 py-0.5 text-[11px] font-extrabold tabular-nums"
                  style={{ background: myOvr != null ? attrColor(myOvr) + '26' : '#e2e8f0', color: myOvr != null ? attrColor(myOvr) : '#64748b' }}
                  title="Kart puanın"
                >
                  {myOvr ?? 'Yeni'}
                </span>
                <Avatar player={me} size={28} color="#16a34a" />
              </Link>
            ) : (
              <Link to="/giris" state={{ from: pathname }} className="btn-primary py-2 text-sm">
                Giriş yap
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 pb-24 lg:max-w-6xl lg:px-6 lg:pb-10 lg:pt-2">
        <Outlet />
      </main>

      {/* Mobil alt menü */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-2xl">
          {nav.map((n) => (
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
