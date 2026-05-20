import { Component, useState, useEffect, lazy, Suspense } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import SessionExpiredModal from './components/SessionExpiredModal.jsx'
import TamperDetectedModal from './components/TamperDetectedModal.jsx'
import OfferPublishedPopup from './components/OfferPublishedPopup.jsx'
import WrongFundingAmountPopup from './components/WrongFundingAmountPopup.jsx'
import { clearCache } from './hooks/useApi.js'
import { invalidateUserPMs } from './hooks/useUserPMs.js'
import { resetSessionExpiredFlag, isTokenExpired } from './utils/sessionGuard.js'
import PeachAuth from './screens/peach-auth.jsx'
import PeachHome from './screens/peach-home.jsx'
import AppLayout from './components/AppLayout.jsx'
import PeachMarket from './screens/market-view/index.jsx'
import OfferCreation from './screens/offer-creation/index.jsx'
import TradesDashboard from './screens/trades-dashboard/index.jsx'
import TradeExecution from './screens/trade-execution/index.jsx'
import SettingsScreen from './screens/settings/index.jsx'
import PeachPaymentMethods from './screens/payment-methods/index.jsx'
import OtherUserPage from './screens/other-user/index.jsx'
import PeachWallet from './screens/wallet/index.jsx'
import { clearWalletCache } from './hooks/useWallet.js'
import { IS_REGTEST } from './utils/network.js'

// ── Developer tools ──
// Build-time gate: VITE_DEV_TOOLS is inlined by Vite, so the && branch and the
// lazy import() are eliminated from production bundles when the flag is unset.
// We additionally require VITE_BITCOIN_NETWORK=REGTEST so the tools never ship
// in a mainnet build even if VITE_DEV_TOOLS is accidentally set.
const DEV_TOOLS_ENABLED = import.meta.env.VITE_DEV_TOOLS === "1" && IS_REGTEST;
const Bip322SignerScreen = DEV_TOOLS_ENABLED
  ? lazy(() => import('./screens/dev-tools/bip322-sign.jsx'))
  : null;

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

function ProtectedRoute({ children }) {
  const token = window.__PEACH_AUTH__?.token;
  if (!token || isTokenExpired(token)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

export default function App() {
  const [sessionExpired, setSessionExpired] = useState(false);
  const [tamperedFields, setTamperedFields] = useState(null);
  const [publishedOffer, setPublishedOffer] = useState(null);
  const [fundingAlert, setFundingAlert] = useState(null);

  useEffect(() => {
    const handleExpired = () => setSessionExpired(true);
    window.addEventListener('peach:session-expired', handleExpired);
    return () => window.removeEventListener('peach:session-expired', handleExpired);
  }, []);

  useEffect(() => {
    const handleTamper = (e) => {
      const field = e?.detail?.field;
      if (!field) return;
      setTamperedFields(prev => {
        const next = new Set(prev || []);
        next.add(field);
        return next;
      });
    };
    window.addEventListener('peach:tamper-detected', handleTamper);
    return () => window.removeEventListener('peach:tamper-detected', handleTamper);
  }, []);

  useEffect(() => {
    const handler = (e) => setPublishedOffer(e?.detail ?? null);
    window.addEventListener('peach:offer-published', handler);
    return () => window.removeEventListener('peach:offer-published', handler);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (e?.detail?.offerId) setFundingAlert(e.detail);
    };
    window.addEventListener('peach:funding-amount-different', handler);
    return () => window.removeEventListener('peach:funding-amount-different', handler);
  }, []);

  function handleReauth() {
    window.__PEACH_AUTH__ = null;
    clearCache();
    invalidateUserPMs();
    clearWalletCache();
    resetSessionExpiredFlag();
    try { localStorage.setItem("peach_logged_in", "false"); } catch {}
    try { sessionStorage.removeItem("peach_auth"); } catch {}
    setSessionExpired(false);
    window.location.hash = '#/';
  }

  return (
    <ErrorBoundary>
      <HashRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<PeachAuth />} />
            <Route path="/home" element={<ProtectedRoute><PeachHome /></ProtectedRoute>} />
            <Route path="/market" element={<PeachMarket />} />
            <Route path="/offer/new" element={<ProtectedRoute><OfferCreation /></ProtectedRoute>} />
            <Route path="/trades" element={<ProtectedRoute><TradesDashboard /></ProtectedRoute>} />
            <Route path="/trade/:id" element={<ProtectedRoute><TradeExecution /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsScreen /></ProtectedRoute>} />
            <Route path="/payment-methods" element={<ProtectedRoute><PeachPaymentMethods /></ProtectedRoute>} />
            <Route path="/wallet" element={<ProtectedRoute><PeachWallet /></ProtectedRoute>} />
            <Route path="/user/:userId" element={<ProtectedRoute><OtherUserPage /></ProtectedRoute>} />
            {Bip322SignerScreen && (
              <Route path="/dev-tools/bip322" element={
                <ProtectedRoute>
                  <Suspense fallback={<div style={{ padding: 40 }}>Loading dev tools…</div>}>
                    <Bip322SignerScreen />
                  </Suspense>
                </ProtectedRoute>
              } />
            )}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppLayout>
        {publishedOffer && (
          <OfferPublishedPopup
            offerId={publishedOffer.offerId}
            onClose={() => setPublishedOffer(null)}
          />
        )}
        {fundingAlert && (
          <WrongFundingAmountPopup
            offerId={fundingAlert.offerId}
            variant={fundingAlert.variant}
            expectedSats={fundingAlert.expectedSats}
            fundedSats={fundingAlert.fundedSats}
            onClose={() => setFundingAlert(null)}
          />
        )}
      </HashRouter>
      {sessionExpired && <SessionExpiredModal onReauth={handleReauth} />}
      {tamperedFields && (
        <TamperDetectedModal
          fields={tamperedFields}
          onClose={() => setTamperedFields(null)}
        />
      )}
    </ErrorBoundary>
  )
}
