import { Component } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import PeachAuth from './screens/peach-auth.jsx'
import PeachHome from './screens/peach-home.jsx'
import PeachMarket from './screens/peach-market-view.jsx'
import OfferCreation from './screens/peach-offer-creation.jsx'
import TradesDashboard from './screens/peach-trades-dashboard.jsx'
import TradeExecution from './screens/peach-trade-execution.jsx'
import SettingsScreen from './screens/peach-settings.jsx'
import PeachPaymentMethods from './screens/peach-payment-methods.jsx'

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
        <div style={{ padding: 40, fontFamily: 'monospace', color: '#DF321F' }}>
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </ErrorBoundary>
  )
}
