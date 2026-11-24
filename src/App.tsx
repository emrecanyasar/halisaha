import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import AuthLayout from './components/AuthLayout'
import RequireAuth from './components/RequireAuth'
import MatchesPage from './pages/MatchesPage'
import LineupToolPage from './pages/LineupToolPage'
import NewMatchPage from './pages/NewMatchPage'
import MatchPage from './pages/MatchPage'
import VotePage from './pages/VotePage'
import ResultPage from './pages/ResultPage'
import PlayerPage from './pages/PlayerPage'
import PlayerFormPage from './pages/PlayerFormPage'
import SettingsPage from './pages/SettingsPage'
import ProfilePage from './pages/ProfilePage'
import GroupsPage from './pages/GroupsPage'
import GroupPage from './pages/GroupPage'
import JoinGroupPage from './pages/JoinGroupPage'
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

      {/* Uygulama sayfaları: giriş yapmadan da açılır */}
      <Route element={<Layout />}>
        <Route index element={<MatchesPage />} />
        <Route path="kadro" element={<LineupToolPage />} />
        <Route path="mac/:id" element={<MatchPage />} />
        <Route path="oyuncu/:id" element={<PlayerPage />} />
        {/* Açık grupların maç listesi herkese görünür; üye sekmeleri sayfa içinde korunur */}
        <Route path="grup/:id" element={<GroupPage />} />
        {/* Eski oyuncular sayfası artık grup sayfasındaki Üyeler / Sıralama sekmelerinde */}
        <Route path="oyuncular" element={<Navigate to="/gruplarim" replace />} />

        {/* Giriş gerektiren sayfalar */}
        <Route element={<RequireAuth />}>
          <Route path="gruplarim" element={<GroupsPage />} />
          <Route path="katil/:kod" element={<JoinGroupPage />} />
          <Route path="mac/yeni" element={<NewMatchPage />} />
          <Route path="mac/:id/sonuc" element={<ResultPage />} />
          <Route path="mac/:id/oy" element={<VotePage />} />
          <Route path="oyuncu/yeni" element={<PlayerFormPage />} />
          <Route path="oyuncu/:id/duzenle" element={<PlayerFormPage />} />
          <Route path="profil" element={<ProfilePage />} />
          <Route path="ayarlar" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
