import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import AuthLayout from './components/AuthLayout'
import MatchesPage from './pages/MatchesPage'
import NewMatchPage from './pages/NewMatchPage'
import MatchPage from './pages/MatchPage'
import VotePage from './pages/VotePage'
import ResultPage from './pages/ResultPage'
import PlayersPage from './pages/PlayersPage'
import PlayerPage from './pages/PlayerPage'
import PlayerFormPage from './pages/PlayerFormPage'
import SettingsPage from './pages/SettingsPage'
import ProfilePage from './pages/ProfilePage'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'

export default function App() {
  return (
    <Routes>
      {/* Giriş yapmamış kullanıcılar için */}
      <Route element={<AuthLayout />}>
        <Route path="giris" element={<LoginPage />} />
        <Route path="kayit" element={<RegisterPage />} />
        <Route path="sifremi-unuttum" element={<ForgotPasswordPage />} />
      </Route>

      {/* Giriş gerektiren uygulama sayfaları */}
      <Route element={<Layout />}>
        <Route index element={<MatchesPage />} />
        <Route path="mac/yeni" element={<NewMatchPage />} />
        <Route path="mac/:id" element={<MatchPage />} />
        <Route path="mac/:id/oy" element={<VotePage />} />
        <Route path="mac/:id/sonuc" element={<ResultPage />} />
        <Route path="oyuncular" element={<PlayersPage />} />
        <Route path="oyuncu/yeni" element={<PlayerFormPage />} />
        <Route path="oyuncu/:id" element={<PlayerPage />} />
        <Route path="oyuncu/:id/duzenle" element={<PlayerFormPage />} />
        <Route path="profil" element={<ProfilePage />} />
        <Route path="ayarlar" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
