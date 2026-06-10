
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import { ClerkProvider } from '@clerk/react'
import { ThemeProvider } from './context/ThemeContext.jsx'

const lilChatLocalization = {
  signIn: {
    start: {
      title: 'Sign in to LilChat',
      subtitle: 'Welcome back! Please sign in to continue',
    }
  },
  signUp: {
    start: {
      title: 'Join LilChat',
      subtitle: 'Create your account and start connecting',
    }
  }
}

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
if(!PUBLISHABLE_KEY) {
  console.error('Publishable key is not defined')
}
createRoot(document.getElementById('root')).render(
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} localization={lilChatLocalization}>
      <BrowserRouter>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </BrowserRouter>
    </ClerkProvider>
)
