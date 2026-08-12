import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './global.css'
import { AppProvider } from '@/providers/app-provider'
import { inicializarCapturaDeInstalacao } from '@/shared/lib/pwa-install'
import { registrarServiceWorker } from '@/shared/lib/push-notifications'

inicializarCapturaDeInstalacao()
registrarServiceWorker().catch(() => {
  // A aplicação continua utilizável mesmo em um navegador sem Service Worker.
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>,
)
