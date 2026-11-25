import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useStore } from '../store/StoreContext'

/** Giriş gerektiren sayfaları korur; giriş yapılmadıysa giriş sayfasına yönlendirir. */
export default function RequireAuth() {
  const { data, loading } = useStore()
  const { pathname } = useLocation()
  // Oturum veritabanından gelirken yönlendirme yapma
  if (loading) return <div className="p-8 text-center text-sm text-muted">Yükleniyor…</div>
  const loggedIn = !!data.currentUserId && data.players.some((p) => p.id === data.currentUserId)
  if (!loggedIn) return <Navigate to="/giris" replace state={{ from: pathname }} />
  return <Outlet />
}
