import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, MemoryRouter } from 'react-router-dom'
import { StoreProvider } from './store/StoreContext'
import App from './App'
import './index.css'

// Önizleme (tek dosya) sürümü bir çerçeve içinde çalıştığı için adres çubuğunu kullanmayan MemoryRouter ile gelir
const Router = import.meta.env.MODE === 'single' ? MemoryRouter : HashRouter

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <StoreProvider>
        <App />
      </StoreProvider>
    </Router>
  </StrictMode>,
)
