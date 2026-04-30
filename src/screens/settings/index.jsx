// ─── SETTINGS — MAIN COMPONENT ───────────────────────────────────────────────
// Split from peach-settings.jsx.
// Sub-screens live in screens.jsx, shared UI in components.jsx.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { SideNav, Topbar, CurrencyDropdown } from "../../components/Navbars.jsx";
import { IcoBtc } from "../../components/BitcoinAmount.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { useApi } from "../../hooks/useApi.js";
import { CSS } from "./styles.js";
import { SettingsRow, SettingsSection } from "./components.jsx";
import {
  ProfileSubScreen, ReferralsSubScreen, BackupsSubScreen,
  NetworkFeesSubScreen, TxBatchingSubScreen, RefundAddressSubScreen,
  PayoutWalletSubScreen, BlockUsersSubScreen,
  NotificationsSubScreen,
  LanguageSubScreen, NodeSubScreen, ContactSubScreen, AboutSubScreen,
} from "./screens.jsx";

export default function SettingsScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentView, setCurrentView] = useState("main");
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);

  // Reset to main view when sidenav "Settings" is clicked (same-route navigation)
  useEffect(() => { setCurrentView("main"); }, [location.key]);

  // ── AUTH STATE ──
  const { isLoggedIn, handleLogin, handleLogout, showAvatarMenu, setShowAvatarMenu } = useAuth();
  const { get } = useApi();
  useEffect(() => {
    if (!showAvatarMenu) return;
    const close = (e) => { if (!e.target.closest(".avatar-menu-wrap")) setShowAvatarMenu(false); };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [showAvatarMenu]);

  const [allPrices,           setAllPrices]           = useState(null);
  const [availableCurrencies, setAvailableCurrencies] = useState(["EUR","CHF","GBP"]);
  const [selectedCurrency,    setSelectedCurrency]    = useState("EUR");
  const pricesLoaded = allPrices !== null;
  const btcPrice = Math.round(allPrices?.[selectedCurrency] ?? 87432);

  useEffect(() => {
    async function fetchPrices() {
      try {
        const res = await get('/market/prices');
        const data = await res.json();
        if (data && typeof data === "object") {
          setAllPrices(data);
          setAvailableCurrencies(Object.keys(data).sort());
        }
      } catch {}
    }
    fetchPrices();
    const iv = setInterval(fetchPrices, 30000);
    return () => clearInterval(iv);
  }, []);

  const satsPerCur = Math.round(100_000_000 / btcPrice);
  const sideMargin = 68;

  function renderContent() {
    if (currentView === "profile")      return <ProfileSubScreen     onBack={() => setCurrentView("main")}/>;
    if (currentView === "referrals")    return <ReferralsSubScreen   onBack={() => setCurrentView("main")}/>;
    if (currentView === "backups")      return <BackupsSubScreen     onBack={() => setCurrentView("main")}/>;
    if (currentView === "network-fees") return <NetworkFeesSubScreen onBack={() => setCurrentView("main")}/>;
    if (currentView === "tx-batching")  return <TxBatchingSubScreen  onBack={() => setCurrentView("main")}/>;
    if (currentView === "refund")       return <RefundAddressSubScreen onBack={() => setCurrentView("main")}/>;
    if (currentView === "payout")       return <PayoutWalletSubScreen  onBack={() => setCurrentView("main")}/>;
    if (currentView === "block-users")  return <BlockUsersSubScreen  onBack={() => setCurrentView("main")}/>;
    if (currentView === "notifications")    return <NotificationsSubScreen    onBack={() => setCurrentView("main")}/>;
    if (currentView === "language")         return <LanguageSubScreen         onBack={() => setCurrentView("main")}/>;
    if (currentView === "node")             return <NodeSubScreen             onBack={() => setCurrentView("main")}/>;
    if (currentView === "contact")          return <ContactSubScreen          onBack={() => setCurrentView("main")}/>;
    if (currentView === "about")            return <AboutSubScreen            onBack={() => setCurrentView("main")}/>;

    return (
      <div className="settings-scroll">
        <h1 className="settings-page-title">Settings</h1>

        <SettingsSection title="Account">
          <SettingsRow icon="👤" label="My Profile"
            description="Reputation, badges, and trading history"
            onClick={() => setCurrentView("profile")}/>
          <SettingsRow icon="🎁" label="Referrals"
            description="Invite friends and earn rewards"
            onClick={() => setCurrentView("referrals")}/>
          <SettingsRow icon="💾" label="Backups"
            description="Back up your account on the mobile app"
            warning={true}
            onClick={() => setCurrentView("backups")}/>
          <SettingsRow icon="🚫" label="Block Users"
            description="Block a user from sending trade requests on your offers"
            onClick={() => setCurrentView("block-users")}
            noBorder/>
        </SettingsSection>

        <SettingsSection title="Trading & Bitcoin">
          <SettingsRow icon="💳" label="Payment Methods"
            description="Add or manage your accepted payment methods"
            onClick={() => navigate("/payment-methods")}/>
          <SettingsRow icon="⛏️" label="Network Fees"
            description="Set your preferred on-chain fee rate"
            onClick={() => setCurrentView("network-fees")}/>
          <SettingsRow icon="📦" label="Transaction Batching"
            description="Combine payouts to save on fees"
            onClick={() => setCurrentView("tx-batching")}/>
          <SettingsRow icon="↩️" label="Refund Address"
            description="Bitcoin address for trade cancellations"
            onClick={() => setCurrentView("refund")}/>
          <SettingsRow icon="📤" label="Custom Payout Address"
            description="Send your sats to an external wallet automatically"
            onClick={() => setCurrentView("payout")}
            noBorder/>
        </SettingsSection>

        <SettingsSection title="App & Notifications">
          <SettingsRow icon="🔔" label="Notifications"
            description="Trade updates, trade requests, and alerts"
            onClick={() => setCurrentView("notifications")}/>
          <SettingsRow icon="🌐" label="Language"
            description="English"
            onClick={() => setCurrentView("language")}
            noBorder/>
        </SettingsSection>

        <SettingsSection title="Advanced & Support">
          <SettingsRow icon="🖧" label="Use Your Own Node"
            description="Connect to a custom Bitcoin node"
            onClick={() => setCurrentView("node")}/>
          <SettingsRow icon="💬" label="Contact Peach"
            description="Get help from the Peach team"
            onClick={() => setCurrentView("contact")}/>
          <SettingsRow icon="ℹ️" label="About Peach"
            description="Version, licenses, and legal info"
            onClick={() => setCurrentView("about")}
            noBorder/>
        </SettingsSection>

        <div className="version-footer">Peach Bitcoin Web · v0.1.0 · Made with 🍑</div>
      </div>
    );
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        <Topbar
          onBurgerClick={() => setSidebarMobileOpen(o => !o)}
          isLoggedIn={isLoggedIn}
          handleLogin={handleLogin}
          handleLogout={handleLogout}
          showAvatarMenu={showAvatarMenu}
          setShowAvatarMenu={setShowAvatarMenu}
          btcPrice={btcPrice}
          pricesLoaded={pricesLoaded}
          selectedCurrency={selectedCurrency}
          availableCurrencies={availableCurrencies}
          onCurrencyChange={c => setSelectedCurrency(c)}
        />

        <SideNav
          active="settings"
          mobileOpen={sidebarMobileOpen}
          onClose={() => setSidebarMobileOpen(false)}
          onNavigate={navigate}
          mobilePriceSlot={
            <div className="mobile-price-pill">
              <IcoBtc size={16}/>
              <div className="mobile-price-text">
                <span className="mobile-price-main">{pricesLoaded ? btcPrice.toLocaleString("fr-FR") : "?"} {selectedCurrency}</span>
                <span className="mobile-price-sats">{pricesLoaded ? satsPerCur.toLocaleString() : "?"} sats / {selectedCurrency.toLowerCase()}</span>
              </div>
              <CurrencyDropdown
                className="mobile-cur-select"
                value={selectedCurrency}
                options={availableCurrencies}
                onChange={setSelectedCurrency}
              />
            </div>
          }
        />

        <div className="page-wrap" style={{ marginLeft: sideMargin }}>
          {renderContent()}
        </div>

        {/* ── AUTH POPUP (when logged out) ── */}
        {!isLoggedIn && (
          <div className="auth-screen-overlay">
            <div className="auth-popup">
              <div className="auth-popup-icon">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round"><rect x="5" y="12" width="18" height="13" rx="3"/><path d="M9 12V9a5 5 0 0 1 10 0v3"/><circle cx="14" cy="19" r="1.5" fill="var(--primary)"/></svg>
              </div>
              <div className="auth-popup-title">Authentication required</div>
              <div className="auth-popup-sub">Please authenticate to access your settings and preferences</div>
              <button className="auth-popup-btn" onClick={handleLogin}>Log in</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
