import { Component, useState, useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import SessionExpiredModal from './components/SessionExpiredModal.jsx'
import { clearCache } from './hooks/useApi.js'
import { resetSessionExpiredFlag } from './utils/sessionGuard.js'
import PeachAuth from './screens/peach-auth.jsx'
import PeachHome from './screens/peach-home.jsx'
import PeachMarket from './screens/market-view/index.jsx'
import OfferCreation from './screens/offer-creation/index.jsx'
import TradesDashboard from './screens/trades-dashboard/index.jsx'
import TradeExecution from './screens/trade-execution/index.jsx'
import SettingsScreen from './screens/settings/index.jsx'
import PeachPaymentMethods from './screens/payment-methods/index.jsx'
import OtherUserPage from './screens/other-user/index.jsx'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, fontFamily: 'monospace', color: 'var(--error)' }}>
          <h2>Something went wrong</h2>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 14 }}>
            {this.state.error.toString()}
            {'\n\n'}
            Check the browser console (F12) for the full stack trace.
          </pre>
          <button onClick={() => { this.setState({ error: null }); window.location.reload(); }}
            style={{ marginTop: 16, padding: '8px 16px', cursor: 'pointer' }}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    const handleExpired = () => setSessionExpired(true);
    window.addEventListener('peach:session-expired', handleExpired);
    return () => window.removeEventListener('peach:session-expired', handleExpired);
  }, []);

  function handleReauth() {
    window.__PEACH_AUTH__ = null;
    clearCache();
    resetSessionExpiredFlag();
    try { localStorage.setItem("peach_logged_in", "false"); } catch {}
    try { sessionStorage.removeItem("peach_auth"); } catch {}
    setSessionExpired(false);
    window.location.hash = '#/';
  }

  return (
    <ErrorBoundary>
      <HashRouter>
        <Routes>
          <Route path="/" element={<PeachAuth />} />
          <Route path="/home" element={<PeachHome />} />
          <Route path="/market" element={<PeachMarket />} />
          <Route path="/offer/new" element={<OfferCreation />} />
          <Route path="/trades" element={<TradesDashboard />} />
          <Route path="/trade/:id" element={<TradeExecution />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="/payment-methods" element={<PeachPaymentMethods />} />
          <Route path="/user/:userId" element={<OtherUserPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
      {sessionExpired && <SessionExpiredModal onReauth={handleReauth} />}
    </ErrorBoundary>
  )
}
