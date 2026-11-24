import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useStore } from '../store/StoreContext'

/** Giriş gerektiren sayfaları korur; giriş yapılmadıysa giriş sayfasına yönlendirir. */
export default function RequireAuth() {
  const { data } = useStore()
  const { pathname } = useLocation()
  const loggedIn = !!data.currentUserId && data.players.some((p) => p.id === data.currentUserId)
  if (!loggedIn) return <Navigate to="/giris" replace state={{ from: pathname }} />
  return <Outlet />
}
