import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { LifeListProvider } from './contexts/LifeListContext'
import { CurrentUserProvider } from './contexts/CurrentUserContext'
import { TripsProvider } from './contexts/TripsContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CurrentUserProvider>
      <LifeListProvider>
        <TripsProvider>
          <App />
        </TripsProvider>
      </LifeListProvider>
    </CurrentUserProvider>
  </StrictMode>,
)
