import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { isTokenExpired } from './utils/sessionGuard.js'
import './styles/global.css'

// Restore auth session from sessionStorage (survives page refresh)
try {
  const stored = sessionStorage.getItem('peach_auth');
  if (stored) {
    const auth = JSON.parse(stored);
    if (auth?.token && !isTokenExpired(auth.token)) {
      window.__PEACH_AUTH__ = auth;
    } else {
      sessionStorage.removeItem('peach_auth');
      try { localStorage.setItem('peach_logged_in', 'false'); } catch {}
    }
  }
} catch {}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
