import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { MobilePassengerApp } from './apps/MobilePassenger'

const root = document.getElementById('root')!;
const isMobileRoute = window.location.pathname.startsWith('/mobile');

createRoot(root).render(
  <StrictMode>
    {isMobileRoute ? <MobilePassengerApp /> : <App />}
  </StrictMode>,
)
