// src/main.jsx - Simplified version
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PrivyProvider } from '@privy-io/react-auth'
import './index.css'
import App from './App.jsx'

const PRIVY_APP_ID = 'cmetwk4ri00gxjn0bo4s91jzb'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        // Minimal config - remove embedded wallets for now
        loginMethods: ['email'],
        appearance: {
          theme: 'light',
          accentColor: '#836EF9',
        }
      }}
    >
      <App />
    </PrivyProvider>
  </StrictMode>,
)